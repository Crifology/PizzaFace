kaboom({
  global: true,
  width: 320,
  height: 240,
  scale: 4,
  fullscreen: true,
  debug: true,
  clearColor: [0, 0, 0, 1], // black background, or make third digit a 1 for blue
});

const MOVE_SPEED = 70;
const JUMP_FORCE = 380;
const FALL_DEATH = 500;

loadSprite("pizza", "/images/pizza.png");
loadSprite("zombieleft", "/images/ZLeft.png");
loadSprite("zombieright", "/images/ZRight.png");
loadSprite("brick", "/images/Brick.png");
loadSprite("PizzaGuyRight", "/images/PGRight.png");
loadSprite("PizzaGuyLeft", "/images/PGLeft.png");
loadSprite("HauntingGhost", "/images/Haunting-Ghost.png");
loadSprite("Doorway", "/images/Doorway.png");

scene("game", ({ level, score }) => {
  layers(["bg", "obj", "ui"], "obj");

  const LEVELS = [
    [
      "           #   $            $      #                  $    =",
      "= $    =      =         $   =     $   $=      $     =      =",
      "===  ====  ====  ====  ==  ===  ===  ===  ==  ===  ====   ==",
      "=                                                          =",
      "=                  $                                       =",
      "=      $   $                =                              =",
      "= ==   ===  == === ===   ====   =  ==  ==  ==  ====  =  ====",
      "$                                                          =",
      "                      =                                    =",
      "===   =   =     ===           =   ==     =      ==    =    =",
      "              $           $   $     $                      =",
      "$   $   =    =          =                       $    $     =",
      "===    === ===   =  =  ===   ===  =    =  === ==  =   ===  =",
      "=     $       $     $  $          $           $      $     =",
      "=   =                                =                    $=",
      "=  ===       &        =             ===    =      ==      ==",
      "=    $                      $           $ #                 ",
      "=        =              $ =                  =   $     $  ^ ",
      "=====  =====  ===== ====  ====  ====   ====  == ====  ======",
    ],
    [
      "   $ =======================  ==== = =============  =  =====",
      "=              $                          $               $=",
      "=   &        $  $                     $        $$    =     =",
      "=====  ==   ==  =  =   =$= =$=  =  == =  ===  ==== =====  ==",
      "               #                              #             ",
      "  $$      =        =      $    =        $     $     =       ",
      "= == == =====  == ===   ====  ===  ===  = = = = = ===  =  ==",
      "=                                                 &        =",
      "  $            #                 $$                        =",
      "        =    $   $ =        $          =     $     $    $  =",
      "=====  ===  ======   =====  = =  === =====  ===  ====   =  =",
      "= &                                                        =",
      "=                  $          #         $                  =",
      "= $     $   $     ===     $  $       =  ==  ==    $      $$=",
      "= = = = = = = = ========  == = = = ============ = = = = ====",
      "=            &                                              ",
      "     $             #       $                                ",
      " $       =       $         ==    $          $=    $         ",
      "=====  =====  ===== ====  ====  ==== = ===  ===  ===  ======",
    ],
    
  ];


  const gamemusic = new Howl({
      src: ['./audio/gamemusic.mp3'],
      autoplay: true,
      loop: true,
      volume: 0.25,
    }) 

  let falldeath = new Howl({
      src: ['./audio/WelhelmFall.mp3'],
      volume: 0.75,
  }) 

  let eating = new Howl({
    src: ['./audio/BitingFood.wav'],
    volume: 0.5,
  })

  let ghostdeath = new Howl({
    src: ['./audio/GhostDeath.wav'],
    volume: 0.5,
  })

  let zombiedeath = new Howl({
    src: ['./audio/Zombie Brains.wav'],
    volume: 0.5,
  })
  
  gamemusic.play();
  Howler.volume(0.3);

  const levelConfig = {
    width: 17,
    height: 17,
    "=": [sprite("brick"), solid(), "brick"],
    "$": [sprite("pizza"), "pizza"],
    "#": [sprite("zombieleft"), solid(), "zombie", { dir: -1 }],
    "&": [sprite("HauntingGhost"), solid(), "ghost", { dir: -1 }],
    "^": [sprite("Doorway"), "door"],
  };

  const gameLevel = addLevel(LEVELS[level], levelConfig);

  const scoreLabel = add([
    text("Pizza Score: " + score),
    pos("top"),
    layer("ui"),
    scale(2.5),
    {
      value: score,
    },
  ]);

  add([
    text("Level " + parseInt(level + 1)),
    pos(width() / 2, height() / 10),
    layer("ui"),
    {
      value: score,
    },
    scale(2.5),
  ]);

  const player = add([
    sprite("PizzaGuyRight"),
    solid(),
    pos(5, 0),
    body(),
    origin("bot"),
    layer("obj"),
  ]);

  player.collides("pizza", (p) => {
    destroy(p);
    eating.play()
    scoreLabel.value++;
    scoreLabel.text = scoreLabel.value;
  });

  player.collides("zombie", (d) => {
    gamemusic.stop()
    zombiedeath.play()
    go("lose2", { score: scoreLabel.value });
  });

  player.collides("ghost", (d) => {
    gamemusic.stop()
    ghostdeath.play()
    go("lose2", { score: scoreLabel.value });
  });

  const ENEMY_SPEED = 50;
  const GHOST_SPEED = 70;

  action("zombie", (d) => {
    d.move(d.dir * -ENEMY_SPEED, 0)
  });

  action("ghost", (d) => {
    d.move(d.dir * -GHOST_SPEED, 0);
  });

  collides("ghost", "brick", (g) => {
    g.dir = -g.dir;
  });

  collides("zombie", "brick", (g) => {
    g.dir = -g.dir;
  });

  player.overlaps("door", () => {

    gamemusic.stop()
  
    go("game", {
      level: level + 1,
      score: scoreLabel.value,
    });
  });

  player.action(() => {
    camPos(player.pos);
    if (player.pos.y >= FALL_DEATH) {
      falldeath.play()
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
    text("YOU FELL! \n\nSCORE: " + score + "\n\nRefresh Browser for \n\nNew Game!", 18),
    origin("center"),
    pos(width() / 2, height() / 2)
  ])
});

scene("lose2", ({ score }) => {
  add([
    text("UNDEAD ATE YOU! \n\nSCORE: " + score + "\n\nRefresh Browser for \n\nNew Game!" , 18),
    origin("center"),
    pos(width() / 2, height() / 2)
  ])

});

start("game", {level: 0, score: 0});
