import { Schema, MapSchema } from "@colyseus/schema";

/**
 * Schema untuk state tiap pemain di dalam room.
 * Menggunakan cara kompatibel untuk JavaScript (tanpa TypeScript decorators).
 */
export class PlayerState extends Schema {}

PlayerState.schema = {
    name: "string",
    x: "number",
    y: "number",
    score: "number",
    correctAnswers: "number",
    answeredCount: "number",
    baseFrame: "number",
    isMoving: "boolean",
    isReady: "boolean",
};

/**
 * Schema untuk state global room.
 */
export class GameRoomState extends Schema {}

GameRoomState.schema = {
    players: { map: PlayerState },
    phase: "string",        // "lobby" | "playing" | "ended"
    currentQuestion: "string",
    currentOptions: "string",
    questionsAnswered: "number",
    maxQuestions: "number",
};
