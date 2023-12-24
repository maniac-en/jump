import {GAME_LEVELS} from './levels.js'
import {DOMDisplay} from './dom_display.js'

// object pixel scaling factor
export const scale = 40;

const playerXSpeed = 7;
const gravity = 30;
const jumpSpeed = 17;

class Vec {
  constructor(x, y) {
    this.x = x; this.y = y;
  }

  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }

  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

class Player {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }

  get type() { return "player"; }

  static create(pos) {
    let offset = -Number('.'+(Player.prototype.size.y + "").split('.')[1]);
    return new Player(pos.plus(new Vec(0, offset)),
      new Vec(0, 0));
  }

  update(time, state, keys) {
    let xSpeed = 0;
    if (keys.ArrowLeft || keys.a) xSpeed -= playerXSpeed;
    if (keys.ArrowRight || keys.d) xSpeed += playerXSpeed;
    let pos = this.pos;
    let movedX = pos.plus(new Vec(xSpeed * time, 0));
    if (!state.level.touches(movedX, this.size, "wall")) {
      pos = movedX;
    }

    let ySpeed = this.speed.y + time * gravity;
    let movedY = pos.plus(new Vec(0, ySpeed * time));
    if (!state.level.touches(movedY, this.size, "wall")) {
      pos = movedY;
    } else if ( (keys.ArrowUp || keys.w || keys[" "]) && ySpeed > 0) {
      ySpeed = -jumpSpeed;
    } else {
      ySpeed = 0;
    }
    return new Player(pos, new Vec(xSpeed, ySpeed));
  }
}

class Lava {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }

  get type() { return "lava"; }

  static create(pos, ch) {
    if (ch === "=") {
      return new Lava(pos, new Vec(2, 0));
    } else if (ch === "|") {
      return new Lava(pos, new Vec(0, 2));
    } else if (ch === "v") {
      return new Lava(pos, new Vec(0, 3), pos);
    }
  }

  update(time, state) {
    let newPos = this.pos.plus(this.speed.times(time));
    if (!state.level.touches(newPos, this.size, "wall")) {
      return new Lava(newPos, this.speed, this.reset);
    } else if (this.reset) {
      return new Lava(this.reset, this.speed, this.reset);
    } else {
      return new Lava(this.pos, this.speed.times(-1));
    }
  }

  collide(state) {
    return new State(state.level, state.actors, "lost");
  }
}

class Coin {
  constructor(pos, basePos, wobble) {
    this.pos = pos;
    this.basePos = basePos;
    this.wobble = wobble;
  }

  get type() { return "coin"; }

  static create(pos) {
    let basePos = pos.plus(new Vec(0.2, 0.2));
    return new Coin(basePos, basePos,
      Math.random() * Math.PI * 2);
  }

  update(time) {
    let wobble = this.wobble + time * 8; // wobbleSpeed = 8
    let wobblePos = Math.sin(wobble) * 0.07; // wobbleDist = 0.07
    return new Coin(this.basePos.plus(new Vec(0, wobblePos)),
      this.basePos, wobble);
  }

  collide(state) {
    let filtered = state.actors.filter(a => a != this);
    let status = state.status;
    if (!filtered.some(a => a.type === "coin")) status = "won";
    return new State(state.level, filtered, status);
  }
}

const levelChars = {
  ".": "empty", "#": "wall", "+": "lava",
  "@": Player, "o": Coin,
  "=": Lava, "|": Lava, "v": Lava
};

class Level {
  constructor(plan) {
    let rows = plan.trim().split('\n').map( r => [...r] );
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = []; // moving elements
    this.total_coins = 0;

    for (let row of rows) {
      for (let actor of row) {
        if (actor === 'o') this.total_coins++;
      }
    }

    this.rows = rows.map( (row, y) => {
      return row.map( (ch, x) => {
        let type = levelChars[ch];
        if (typeof type === "string") return type;
        this.startActors.push(type.create(new Vec(x, y), ch));
        return "empty";
      });
    });
  }

  touches(pos, size, type) {
    let xStart = Math.floor(pos.x);
    let xEnd = Math.ceil(pos.x + size.x);
    let yStart = Math.floor(pos.y);
    let yEnd = Math.ceil(pos.y + size.y);

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        let isOutside = x < 0 || x >= this.width ||
          y < 0 || y >= this.height;
        let here = isOutside ? "wall" : this.rows[y][x];
        if (here === type) return true;
      }
    }
    return false;
  }
}

class State {
  constructor(level, actors, status) {
    this.level = level;
    this.actors = actors;
    this.status = status;
  }

  static start(level) {
    return new State(level, level.startActors, "playing");
  }

  get player() {
    return this.actors.find(a => a.type === "player");
  }

  update(time, keys) {
    let actors = this.actors
      .map(actor => actor.update(time, this, keys));
    let newState = new State(this.level, actors, this.status);

    if (newState.status != "playing") return newState;

    let player = newState.player;
    if (this.level.touches(player.pos, player.size, "lava")) {
      return new State(this.level, actors, "lost");
    }

    for (let actor of actors) {
      if (actor != player && overlap(actor, player)) {
        newState = actor.collide(newState);
      }
    }
    return newState;
  }
}

function overlap(actor1, actor2) {
  return actor1.pos.x + actor1.size.x > actor2.pos.x &&
    actor1.pos.x < actor2.pos.x + actor2.size.x &&
    actor1.pos.y + actor1.size.y > actor2.pos.y &&
    actor1.pos.y < actor2.pos.y + actor2.size.y;
}

function trackKeys(keys) {
  let down = Object.create(null);
  function track(event) {
    if (keys.includes(event.key)) {
      down[event.key] = event.type == "keydown";
      event.preventDefault();
    }
  }
  window.addEventListener("keydown", track);
  window.addEventListener("keyup", track);
  down.unregister = () => {
    window.removeEventListener("keydown", track);
    window.removeEventListener("keyup", track);
  };
  return down;
}

function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    if (lastTime != null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runLevel(level, Display, level_count) {
  let display = new Display(document.body, level);
  display.level_counter_dom.innerHTML = level_count;
  let state = State.start(level);
  let ending = 1;
  let running = "yes";

  return new Promise(resolve => {
    function escHandler(event) {
      if (event.key != "Escape") return;
      event.preventDefault();
      if (running === "no") {
        running = "yes";
        runAnimation(frame);
      } else if (running === "yes") {
        running = "pausing";
      } else {
        running = "yes";
      }
    }

    window.addEventListener("keydown", escHandler);
    let arrowKeys =
      trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp", "w", "a", "d", " "]);

    function frame(time) {
      if (running === "pausing") {
        running = "no";
        return false;
      }

      state = state.update(time, arrowKeys);
      display.syncState(state);
      if (state.status === "playing") {
        return true;
      } else if (ending > 0) {
        ending -= time;
        return true;
      } else {
        display.clear();
        window.removeEventListener("keydown", escHandler);
        arrowKeys.unregister();
        resolve(state.status);
        return false;
      }
    }
    runAnimation(frame);
  });
}

Player.prototype.size = new Vec(0.8, 1.5);
Lava.prototype.size = new Vec(1, 1);
Coin.prototype.size = new Vec(0.6, 0.6);

async function runGame(plans, Display) {
  for (let level = 0; level < plans.length;) {
    let status = await runLevel(new Level(plans[level]), Display, level + 1);
    if (status === "won") level++;
  }
  console.log("You've won!");
}

runGame(GAME_LEVELS, DOMDisplay);

