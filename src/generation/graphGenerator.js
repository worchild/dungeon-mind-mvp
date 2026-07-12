const DIRECTIONS = [
  { dir: "North", dx: 0, dy: -1, opposite: "South" },
  { dir: "East", dx: 1, dy: 0, opposite: "West" },
  { dir: "South", dx: 0, dy: 1, opposite: "North" },
  { dir: "West", dx: -1, dy: 0, opposite: "East" },
];

const key = (x, y) => `${x},${y}`;

export function generateRoomGraph(rng, { roomCount = 10, width = 5, height = 5, loopChance = 0.25 } = {}) {
  if (roomCount < 4 || roomCount > width * height) throw new Error("roomCount does not fit generation bounds.");

  const cells = [{ x: Math.floor(width / 2), y: height - 1 }];
  const occupied = new Set([key(cells[0].x, cells[0].y)]);

  while (cells.length < roomCount) {
    const frontier = [];
    cells.forEach((cell, fromIndex) => {
      DIRECTIONS.forEach(direction => {
        const x = cell.x + direction.dx;
        const y = cell.y + direction.dy;
        if (x < 0 || y < 0 || x >= width || y >= height || occupied.has(key(x, y))) return;
        frontier.push({ x, y, fromIndex });
      });
    });
    if (!frontier.length) throw new Error("Unable to place requested room count.");
    const chosen = rng.pick(frontier);
    cells.push({ x: chosen.x, y: chosen.y, parentIndex: chosen.fromIndex });
    occupied.add(key(chosen.x, chosen.y));
  }

  const rooms = cells.map((cell, index) => ({
    id: `R${String(index + 1).padStart(2, "0")}`,
    map: [cell.x, cell.y],
    exits: [],
    depth: 0,
  }));

  const connect = (aIndex, bIndex) => {
    const a = rooms[aIndex];
    const b = rooms[bIndex];
    const dx = b.map[0] - a.map[0];
    const dy = b.map[1] - a.map[1];
    const direction = DIRECTIONS.find(item => item.dx === dx && item.dy === dy);
    if (!direction || a.exits.some(exit => exit.to === b.id)) return;
    a.exits.push({ dir: direction.dir, to: b.id });
    b.exits.push({ dir: direction.opposite, to: a.id });
  };

  cells.forEach((cell, index) => {
    if (index > 0) connect(index, cell.parentIndex);
  });

  cells.forEach((cell, index) => {
    DIRECTIONS.forEach(direction => {
      const adjacentIndex = cells.findIndex(candidate =>
        candidate.x === cell.x + direction.dx && candidate.y === cell.y + direction.dy,
      );
      if (adjacentIndex > index && rng.next() < loopChance) connect(index, adjacentIndex);
    });
  });

  const queue = [0];
  const visited = new Set([0]);
  while (queue.length) {
    const index = queue.shift();
    rooms[index].exits.forEach(exit => {
      const nextIndex = rooms.findIndex(room => room.id === exit.to);
      if (visited.has(nextIndex)) return;
      visited.add(nextIndex);
      rooms[nextIndex].depth = rooms[index].depth + 1;
      queue.push(nextIndex);
    });
  }

  const finale = [...rooms].sort((a, b) => b.depth - a.depth || b.exits.length - a.exits.length)[0];
  return { rooms, entranceRoomId: rooms[0].id, finaleRoomId: finale.id, width, height };
}
