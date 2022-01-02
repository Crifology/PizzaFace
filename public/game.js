kaboom({
  global: true,
  width: 640,
  height: 480,
  scale: 2,
  fullscreen: true,
  debug: true,
  clearColor: [0, 0, 0, 1], // black background, or make third digit a 1 for blue
});

const MOVE_SPEED = 100;
const JUMP_FORCE = 500;
const FALL_DEATH = 700;

loadSprite("pizza", "/public/images/pepp-pizza.png");
loadSprite("zombie", "/public/images/FatZombieLeft.png");
loadSprite("brick", "/public/images/Brick2.png");
loadSprite("PizzaGuyRight", "/public/images/pizzaguyright.png");
loadSprite("PizzaGuyLeft", "/public/images/pizzaguyleft.png");
loadSprite("HauntingGhost", "/public/images/Haunting-Ghost.png");
loadSprite("Doorway", "/public/images/Doorway.png");

scene("game", ({ level, score }) => {
  layers(["bg", "obj", "ui"], "obj");

  const gameboard = [
    [
      "                                           $$             #",
      "            #         $$      $   $$   #$       $          ",
      "                $                            $    $    # $ ",
      "==       =====   =    ===    ===  =    =  &  =    =   =    ",
      "      $       $     $  $       #     $$        $      $    ",
      "             &                                    $    $  $",
      "    ===               ==    $$       ==          =    =  ==",
      "$$       $$    #     $$$   #$      #    $ #        $      ^",
      "                                                   $    $  ",
      "=====  =====  =====  ===  ====  =====  ====  ==  ====  ====",
      "                                                           ",
    ],
    [
      "==$                 $                                      ",
      "           $$ $     =   $$           & =      #     $   $  ",
      "               #    =         $$       =    $$      $   #  ",
      "           ==  =   ==   =    ===      ===   ===    ===   $$",
      "=&              #       $         #              #      #==",
      "    $          $$          $            $$       $$        ",
      " $  =  ==      ===      =     $  $   & ====      == & $    ",
      "       #                  #      =          #             #",
      "$$       $$          $$$      $  =                    $$  ^",
      "==     ====   ====  =======  ==  =   = ===  ==  =  =  =====",
      "                                                           ",
    ],
    [
      "                                           $$  $$   $$$    ",
      "           $$ $$      $$$      $$    $$$                   ",
      " $$$                                                       ",
      "====     ===  ==   == =   ===   ==   ====   ===   == = = ==",
      "    $$ $           $$  $$              $$  $$$      $$   $$",
      "  =                                 &               =      ",
      "    ===  =    ==   ==     ==   =     ==          =    =  ==",
      "    $$$ $    $$$$     $$$   $$$     $  $$$$     $$ $     $$",
      "                                                           ",
      "= = == =  ==  == =  === =  === = = ==== ===   ==  == = =  =",
      "                                                           ",
    ],
  ];

  const levelConfig = {
    width: 32,
    height: 32,
    "=": [sprite("brick"), solid(), "brick"],
    "$": [sprite("pizza"), solid(), "pizza"],
    "#": [sprite("zombie"), solid(), "dangerous"],
    "&": [sprite("HauntingGhost"), solid(), "ghost", { dir: -1 }],
    "^": [sprite("Doorway"), "door"],
  };

  const gameLevel = addLevel(gameboard[level], levelConfig);

  const scoreLabel = add([
    text("Pizza Score: " + score),
    pos(20, 0),
    pos(400, 0),
    layer("ui"),
    scale(2),
    {
      value: score,
    },
  ]);

  add([
    text("Level " + parseInt(level + 1)),
    pos(width() / 2, height() / 2),
    layer("ui"),
    {
      value: score,
    },
    scale(2),
  ]);

  const player = add([
    sprite("PizzaGuyRight"),
    solid(),
    pos(30, 0),
    body(),
    origin("bot"),
    layer("obj"),
  ]);

  player.collides("pizza", (p) => {
    destroy(p);
    scoreLabel.value++;
    scoreLabel.text = scoreLabel.value;
  });

  player.collides("dangerous", (d) => {
    go("lose2", { score: scoreLabel.value });
  });

  player.collides("ghost", (d) => {
    go("lose2", { score: scoreLabel.value });
  });

  const ENEMY_SPEED = 85;
  const GHOST_SPEED = 125;

  action("dangerous", (d) => {
    d.move(-ENEMY_SPEED, 0);
  });

  action("ghost", (d) => {
    d.move(d.dir * GHOST_SPEED, 0);
  });

  collides("ghost", "brick", (g) => {
    g.dir = -g.dir;
  });

  player.overlaps("door", () => {
    go("game", {
      level: level + 1,
      score: scoreLabel.value,
    });
  });

  player.action(() => {
    camPos(player.pos);
    if (player.pos.y >= FALL_DEATH) {
      go("lose", { score: scoreLabel.value });
    }
  });

  keyDown("left", () => {
    player.move(-MOVE_SPEED, 0);
    player.changeSprite("PizzaGuyLeft");
  });

  keyDown("right", () => {
    player.move(MOVE_SPEED, 0);
    player.changeSprite("PizzaGuyRight");
  });

  keyPress("space", () => {
    if (player.grounded()) {
      player.jump(JUMP_FORCE);
    }
  });
});

scene("lose", ({ score }) => {
  add([
    text("YOU FELL! SCORE: " + score, 32),
    origin("center"),
    pos(width() / 2, height() / 2),
  ]);
});
scene("lose2", ({ score }) => {
  add([
    text("UNDEAD ATE YOU! SCORE: " + score, 32),
    origin("center"),
    pos(width() / 2, height() / 2),
  ]);
});

start("game", { level: 0, score: 0 });
