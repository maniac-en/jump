import {scale} from './game.js'

export class DOMDisplay {
  constructor(parent, level) {
    this.total_coins = level.total_coins;
    this.coin_counter_dom = document.getElementById('coin_counter');
    this.level_counter_dom = document.getElementById('level_counter');
    this.dom = create_dom_elements("div", {class: "game"}, drawGrid(level));
    this.actorLayer = null;
    parent.appendChild(this.dom);
  }

  clear() { this.dom.remove(); }
}

function create_dom_elements(name, attrs, ...children) {
  let dom = document.createElement(name);
  for (let attr of Object.keys(attrs)) {
    dom.setAttribute(attr, attrs[attr]);
  }
  for (let child of children) {
    dom.appendChild(child);
  }
  return dom;
}

function drawGrid(level) {
  return create_dom_elements("table", {
    class: "background",
    style: `width: ${level.width * scale}px`
  }, ...level.rows.map(row =>
    create_dom_elements("tr", {style: `height: ${scale}px`},
      ...row.map(type => create_dom_elements("td", {class: type})))
  ));
}

function drawActors(actors) {
  return create_dom_elements("div", {}, ...actors.map(actor => {
    let rect = create_dom_elements("div", {class: `actor ${actor.type}`});
    rect.style.width = `${actor.size.x * scale}px`;
    rect.style.height = `${actor.size.y * scale}px`;
    rect.style.left = `${actor.pos.x * scale}px`;
    rect.style.top = `${actor.pos.y * scale}px`;
    return rect;
  }));
}

function calCoins(actors, total_coins) {
  let current_coins = total_coins - actors.filter( a => a.type === "coin" ).length;
  return current_coins + '/' + total_coins;
}

DOMDisplay.prototype.syncState = function(state) {
  if (this.actorLayer) this.actorLayer.remove();
  this.actorLayer = drawActors(state.actors);
  this.dom.appendChild(this.actorLayer);
  this.dom.className = `game ${state.status}`;
  this.scrollPlayerIntoView(state);
  this.coin_counter_dom.innerHTML = calCoins(state.actors, this.total_coins);
};

DOMDisplay.prototype.scrollPlayerIntoView = function(state) {
  let width = this.dom.clientWidth;
  let height = this.dom.clientHeight;
  let margin = width / 3;

  // The viewport
  let left = this.dom.scrollLeft, right = left + width;
  let top = this.dom.scrollTop, bottom = top + height;

  let player = state.player;
  let center = player.pos.plus(player.size.times(0.5))
    .times(scale);

  if (center.x < left + margin) {
    this.dom.scrollLeft = center.x - margin;
  } else if (center.x > right - margin) {
    this.dom.scrollLeft = center.x + margin - width;
  }
  if (center.y < top + margin) {
    this.dom.scrollTop = center.y - margin;
  } else if (center.y > bottom - margin) {
    this.dom.scrollTop = center.y + margin - height;
  }
};

