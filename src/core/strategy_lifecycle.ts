import type { LogicalTime } from "./value_objects.js";
import type { OrderIntentId, Position } from "./domain_types.js";

export type StrategyLifecycleConfig = {
  /**
   * Minimum hold time in logical time units.
   * Rotation exits are blocked until the hold time has expired.
   */
  minimumHoldTime: number;
  /**
   * Cooldown duration in logical time units.
   * No buy evaluations are allowed during cooldown.
   */
  cooldownDuration: number;
};

export function createStrategyLifecycleConfig(
  config: StrategyLifecycleConfig
): StrategyLifecycleConfig {
  if (
    !Number.isSafeInteger(config.minimumHoldTime) ||
    config.minimumHoldTime < 0
  ) {
    throw new Error("minimumHoldTime must be a non-negative safe integer");
  }
  if (
    !Number.isSafeInteger(config.cooldownDuration) ||
    config.cooldownDuration < 0
  ) {
    throw new Error("cooldownDuration must be a non-negative safe integer");
  }
  return config;
}

export type ExitReason = "ROTATION_SELL" | "SAFETY_SELL";

export type StrategyLifecycleState =
  | { tag: "IDLE" }
  | { tag: "EVALUATION" }
  | { tag: "ENTRY"; buyOrderIntentId: OrderIntentId }
  | { tag: "HOLDING"; position: Position; enteredAt: LogicalTime }
  | {
      tag: "EXIT";
      position: Position;
      enteredAt: LogicalTime;
      exitReason: ExitReason;
      sellOrderIntentId: OrderIntentId;
    }
  | { tag: "COOLDOWN"; cooldownUntil: LogicalTime }
  | { tag: "REENTRY_ELIGIBILITY" };

export type StrategyLifecycle = {
  config: StrategyLifecycleConfig;
  state: StrategyLifecycleState;
};

export function initializeStrategyLifecycle(
  config: StrategyLifecycleConfig
): StrategyLifecycle {
  return {
    config: createStrategyLifecycleConfig(config),
    state: { tag: "IDLE" }
  };
}

export class InvalidLifecycleTransitionError extends Error {
  readonly name = "InvalidLifecycleTransitionError";
  constructor(message: string) {
    super(message);
  }
}

export type StrategyLifecycleEvent =
  | { type: "META_TRIGGER_EVALUATION" }
  | { type: "META_TRIGGER_IDLE" }
  | { type: "EVALUATION_NO_ACTION" }
  | { type: "EVALUATION_BUY_INTENT_CREATED"; buyOrderIntentId: OrderIntentId }
  | { type: "BUY_EXECUTION_SUCCEEDED"; position: Position; logicalTime: LogicalTime }
  | { type: "BUY_EXECUTION_FAILED" }
  | {
      type: "REQUEST_ROTATION_EXIT";
      sellOrderIntentId: OrderIntentId;
      logicalTime: LogicalTime;
    }
  | { type: "REQUEST_SAFETY_EXIT"; sellOrderIntentId: OrderIntentId }
  | { type: "SELL_EXECUTION_SUCCEEDED"; logicalTime: LogicalTime }
  | { type: "SELL_EXECUTION_FAILED" }
  /**
   * This represents logical/meta time, not wall-clock time.
   */
  | { type: "LOGICAL_TIME_ADVANCED"; logicalTime: LogicalTime };

export function transitionStrategyLifecycle(
  lifecycle: StrategyLifecycle,
  event: StrategyLifecycleEvent
): StrategyLifecycle {
  const next = applyTransition(lifecycle, event);
  assertLifecycleInvariants(next);
  return next;
}

function applyTransition(
  lifecycle: StrategyLifecycle,
  event: StrategyLifecycleEvent
): StrategyLifecycle {
  const { config, state } = lifecycle;

  // Safety exit (interrupt): overrides all other decisions when a position exists.
  // Applies at any stage; if no position exists, it is recorded elsewhere and no
  // lifecycle transition occurs (spec).
  if (event.type === "REQUEST_SAFETY_EXIT") {
    if (state.tag === "HOLDING") {
      return {
        config,
        state: {
          tag: "EXIT",
          position: state.position,
          enteredAt: state.enteredAt,
          exitReason: "SAFETY_SELL",
          sellOrderIntentId: event.sellOrderIntentId
        }
      };
    }
    if (state.tag === "EXIT") {
      // Clarification: Safety during Exit overwrites the Exit reason.
      return {
        config,
        state: { ...state, exitReason: "SAFETY_SELL" }
      };
    }
    // No open position in other states.
    return lifecycle;
  }

  // Time advancement: used to deterministically move COOLDOWN -> REENTRY_ELIGIBILITY.
  if (event.type === "LOGICAL_TIME_ADVANCED") {
    if (state.tag === "COOLDOWN") {
      if (event.logicalTime >= state.cooldownUntil) {
        return { config, state: { tag: "REENTRY_ELIGIBILITY" } };
      }
    }
    return lifecycle;
  }

  switch (state.tag) {
    case "IDLE": {
      if (event.type === "META_TRIGGER_EVALUATION") {
        return { config, state: { tag: "EVALUATION" } };
      }
      return invalidFrom(state, event);
    }

    case "EVALUATION": {
      if (event.type === "EVALUATION_NO_ACTION") {
        return { config, state: { tag: "IDLE" } };
      }
      if (event.type === "EVALUATION_BUY_INTENT_CREATED") {
        return {
          config,
          state: { tag: "ENTRY", buyOrderIntentId: event.buyOrderIntentId }
        };
      }
      return invalidFrom(state, event);
    }

    case "ENTRY": {
      // Buy must complete before any further evaluation.
      if (event.type === "BUY_EXECUTION_FAILED") {
        return { config, state: { tag: "IDLE" } };
      }
      if (event.type === "BUY_EXECUTION_SUCCEEDED") {
        return {
          config,
          state: {
            tag: "HOLDING",
            position: event.position,
            enteredAt: event.logicalTime
          }
        };
      }
      return invalidFrom(state, event);
    }

    case "HOLDING": {
      if (event.type === "REQUEST_ROTATION_EXIT") {
        // Clarification: Rotation before hold-time-end is a No-Op (remain Holding).
        if (!isHoldTimeExpired(config.minimumHoldTime, state.enteredAt, event.logicalTime)) {
          return lifecycle;
        }
        return {
          config,
          state: {
            tag: "EXIT",
            position: state.position,
            enteredAt: state.enteredAt,
            exitReason: "ROTATION_SELL",
            sellOrderIntentId: event.sellOrderIntentId
          }
        };
      }
      return invalidFrom(state, event);
    }

    case "EXIT": {
      // Sell execution is mandatory once initiated. No new buy may occur until sell completes.
      if (event.type === "SELL_EXECUTION_FAILED") {
        // Position remains open.
        return {
          config,
          state: { tag: "HOLDING", position: state.position, enteredAt: state.enteredAt }
        };
      }
      if (event.type === "SELL_EXECUTION_SUCCEEDED") {
        return {
          config,
          state: {
            tag: "COOLDOWN",
            cooldownUntil: addDuration(event.logicalTime, config.cooldownDuration)
          }
        };
      }
      return invalidFrom(state, event);
    }

    case "COOLDOWN": {
      // No buy evaluations are allowed during cooldown.
      return invalidFrom(state, event);
    }

    case "REENTRY_ELIGIBILITY": {
      if (event.type === "META_TRIGGER_EVALUATION") {
        return { config, state: { tag: "EVALUATION" } };
      }
      if (event.type === "META_TRIGGER_IDLE") {
        return { config, state: { tag: "IDLE" } };
      }
      return invalidFrom(state, event);
    }

    default: {
      // Exhaustiveness guard
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function invalidFrom(
  state: StrategyLifecycleState,
  event: StrategyLifecycleEvent
): never {
  throw new InvalidLifecycleTransitionError(
    `Invalid transition: state=${state.tag} event=${event.type}`
  );
}

function isHoldTimeExpired(
  minimumHoldTime: number,
  enteredAt: LogicalTime,
  now: LogicalTime
): boolean {
  return now >= addDuration(enteredAt, minimumHoldTime);
}

function addDuration(time: LogicalTime, duration: number): LogicalTime {
  // LogicalTime is a branded number, durations are safe integers.
  return (time + duration) as LogicalTime;
}

export function assertLifecycleInvariants(lifecycle: StrategyLifecycle): void {
  const { state } = lifecycle;

  // Invariants from the lifecycle spec:
  // - At most one open position per strategy instance
  // - Buy and Sell are never concurrent
  // - Execution never occurs without an OrderIntent
  // - Strategy logic never executes during execution
  //
  // The state modeling enforces these structurally.

  if (state.tag === "ENTRY") {
    if (state.buyOrderIntentId.length === 0) {
      throw new Error("Invariant violated: Entry requires a Buy OrderIntent");
    }
  }

  if (state.tag === "EXIT") {
    if (state.sellOrderIntentId.length === 0) {
      throw new Error("Invariant violated: Exit requires a Sell OrderIntent");
    }
  }
}

