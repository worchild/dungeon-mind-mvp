import test from "node:test";
import assert from "node:assert/strict";
import { createRng } from "../src/generation/rng.js";
import { generateRoomGraph } from "../src/generation/graphGenerator.js";

function snapshot(seed) {
  return generateRoomGraph(createRng(seed), { roomCount: 10 });
}

test("same seed reproduces the same graph", () => {
  assert.deepEqual(snapshot("DM-REPEATABLE"), snapshot("DM-REPEATABLE"));
});

test("representative seeds create connected reciprocal graphs", () => {
  for (let index = 0; index < 1000; index += 1) {
    const graph = snapshot(`DM-TEST-${index}`);
    assert.equal(graph.rooms.length, 10);
    assert.notEqual(graph.entranceRoomId, graph.finaleRoomId);
    const rooms = Object.fromEntries(graph.rooms.map(room => [room.id, room]));
    const reached = new Set([graph.entranceRoomId]);
    const queue = [graph.entranceRoomId];
    while (queue.length) {
      const id = queue.shift();
      for (const exit of rooms[id].exits) {
        assert.ok(rooms[exit.to].exits.some(back => back.to === id));
        if (!reached.has(exit.to)) {
          reached.add(exit.to);
          queue.push(exit.to);
        }
      }
    }
    assert.equal(reached.size, 10);
    assert.ok(reached.has(graph.finaleRoomId));
    assert.equal(new Set(graph.rooms.map(room => room.map.join(","))).size, 10);
  }
});
