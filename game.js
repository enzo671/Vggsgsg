const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const inventoryList = document.getElementById("inventory");
const selectedBlockText = document.getElementById("selected-block");

const TILE = 32;
const WORLD_W = 100;
const WORLD_H = 60;
const VIEW_W = Math.floor(canvas.width / TILE);
const VIEW_H = Math.floor(canvas.height / TILE);

const BLOCKS = {
  air: { id: 0, name: "Ar", color: null },
  grass: { id: 1, name: "Grama", color: "#4caf50" },
  dirt: { id: 2, name: "Terra", color: "#8d6e63" },
  stone: { id: 3, name: "Pedra", color: "#7f8c8d" },
  wood: { id: 4, name: "Madeira", color: "#8b5a2b" },
  leaf: { id: 5, name: "Folha", color: "#2e7d32" },
};

const idToBlock = Object.values(BLOCKS).reduce((acc, b) => {
  acc[b.id] = b;
  return acc;
}, {});

const hotbar = [BLOCKS.grass.id, BLOCKS.dirt.id, BLOCKS.stone.id, BLOCKS.wood.id, BLOCKS.leaf.id];
let selectedSlot = 0;

const inventory = {
  [BLOCKS.grass.id]: 30,
  [BLOCKS.dirt.id]: 40,
  [BLOCKS.stone.id]: 50,
  [BLOCKS.wood.id]: 20,
  [BLOCKS.leaf.id]: 20,
};

const world = Array.from({ length: WORLD_H }, () => Array.from({ length: WORLD_W }, () => BLOCKS.air.id));

for (let y = 0; y < WORLD_H; y++) {
  for (let x = 0; x < WORLD_W; x++) {
    if (y > 24) world[y][x] = BLOCKS.stone.id;
    else if (y > 18) world[y][x] = BLOCKS.dirt.id;
    else if (y === 18) world[y][x] = BLOCKS.grass.id;
  }
}

for (let i = 0; i < 40; i++) {
  const tx = 2 + Math.floor(Math.random() * (WORLD_W - 4));
  addTree(tx, 17);
}

function addTree(x, groundY) {
  for (let h = 1; h <= 3; h++) {
    setBlock(x, groundY - h, BLOCKS.wood.id);
  }
  for (let ly = groundY - 5; ly <= groundY - 3; ly++) {
    for (let lx = x - 2; lx <= x + 2; lx++) {
      if (Math.abs(lx - x) + Math.abs(ly - (groundY - 4)) < 4) {
        setBlock(lx, ly, BLOCKS.leaf.id);
      }
    }
  }
}

const player = {
  x: 20,
  y: 16,
};

const keys = new Set();
window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (["1", "2", "3", "4", "5"].includes(e.key)) {
    selectedSlot = Number(e.key) - 1;
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
  const { x, y } = mouseToWorld(e);
  if (!inside(x, y)) return;

  if (e.button === 0) {
    const id = getBlock(x, y);
    if (id !== BLOCKS.air.id) {
      world[y][x] = BLOCKS.air.id;
      inventory[id] = (inventory[id] ?? 0) + 1;
    }
  }

  if (e.button === 2) {
    const selected = hotbar[selectedSlot];
    if ((inventory[selected] ?? 0) > 0 && getBlock(x, y) === BLOCKS.air.id) {
      world[y][x] = selected;
      inventory[selected] -= 1;
    }
  }
});

function mouseToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  const px = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const cam = camera();
  return {
    x: Math.floor(px / TILE) + cam.x,
    y: Math.floor(py / TILE) + cam.y,
  };
}

function setBlock(x, y, id) {
  if (inside(x, y)) world[y][x] = id;
}
function getBlock(x, y) {
  return inside(x, y) ? world[y][x] : BLOCKS.stone.id;
}
function inside(x, y) {
  return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
}

function update() {
  let nx = player.x;
  let ny = player.y;
  if (keys.has("w")) ny -= 0.1;
  if (keys.has("s")) ny += 0.1;
  if (keys.has("a")) nx -= 0.1;
  if (keys.has("d")) nx += 0.1;

  if (canStand(nx, ny)) {
    player.x = nx;
    player.y = ny;
  }
}

function canStand(x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  return getBlock(tx, ty) === BLOCKS.air.id;
}

function camera() {
  const x = Math.min(Math.max(0, Math.floor(player.x - VIEW_W / 2)), WORLD_W - VIEW_W);
  const y = Math.min(Math.max(0, Math.floor(player.y - VIEW_H / 2)), WORLD_H - VIEW_H);
  return { x, y };
}

function render() {
  const cam = camera();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const wx = cam.x + x;
      const wy = cam.y + y;
      const block = idToBlock[getBlock(wx, wy)];

      if (block.id !== BLOCKS.air.id) {
        ctx.fillStyle = block.color;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  const px = (player.x - cam.x) * TILE;
  const py = (player.y - cam.y) * TILE;
  ctx.fillStyle = "#ffd54f";
  ctx.fillRect(px, py, TILE, TILE);
  ctx.strokeStyle = "#222";
  ctx.strokeRect(px, py, TILE, TILE);

  drawHotbar();
  drawInventory();
}

function drawHotbar() {
  const barW = hotbar.length * 54;
  const x0 = canvas.width / 2 - barW / 2;
  const y0 = canvas.height - 52;

  for (let i = 0; i < hotbar.length; i++) {
    const blockId = hotbar[i];
    const block = idToBlock[blockId];
    const x = x0 + i * 54;

    ctx.fillStyle = i === selectedSlot ? "#ffffff" : "#d9d9d9";
    ctx.fillRect(x, y0, 50, 44);
    ctx.fillStyle = block.color;
    ctx.fillRect(x + 4, y0 + 4, 24, 24);
    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    ctx.fillText(String(inventory[blockId] ?? 0), x + 31, y0 + 20);
    ctx.fillText(String(i + 1), x + 20, y0 + 38);
  }
}

function drawInventory() {
  selectedBlockText.textContent = idToBlock[hotbar[selectedSlot]].name;
  inventoryList.innerHTML = "";
  hotbar.forEach((id) => {
    const li = document.createElement("li");
    li.textContent = `${idToBlock[id].name}: ${inventory[id] ?? 0}`;
    inventoryList.appendChild(li);
  });
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
