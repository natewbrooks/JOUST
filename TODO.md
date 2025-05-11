# TODO - JOUST.

## Objective

Create a 3D jousting game in the browser with pixelated visuals, side-scrolling mechanics, dynamic camera transitions, and a point-based scoring system using Three.js and WebGL.

---

## Week-by-Week Tasks

### Week 1 – Initial Setup and Visuals

- [x] Research pixelation shaders in Three.js
- [ ] Plan dynamic camera (side view to front cinematic view)
- [ ] Design low-poly arena and layout of spectators
- [x] Model base knight and horse in Blender

### Week 2 – Movement and Side View Mechanics

- [ ] Implement A/S key input for speed tapping
- [ ] Display MPH dynamically based on input
- [ ] Animate horse acceleration and movement
- [ ] Set up side-scrolling camera system

### Week 3 – Combat Targeting and Cinematics

- [ ] Build strike window with timed camera transition
- [ ] Enable mouse-controlled lance targeting
- [ ] Highlight body zones (head, chest, shoulders, arms) on hover
- [ ] Finish front-view combat perspective

### Week 4 – Physics, Reactions, and Lance States

- [ ] Integrate Cannon.js or Ammo.js for collisions
- [ ] Apply collision force and physics to knight and lance
- [ ] Create lance break states: tip, half, full
- [ ] Animate knight getting hit, staggering, falling

### Week 5 – UI, Scoring System, and Audio

- [ ] Create score tracker and bout system
- [ ] Implement lance icons that reflect bout outcome
- [ ] Add medieval background music and sound effects
- [ ] Build cinematic King reveal with flag announcement
- [ ] Add mute toggles for music and sound effects

### Week 6 – Final Polish and Deliverables

- [ ] Playtest full 4-bout loop
- [ ] Debug and optimize performance
- [ ] Finalize documentation and instructions
- [ ] Record and produce demo video
- [ ] Prepare codebase for submission

---

## Gameplay Features Checklist

### Core Mechanics

- [ ] Four interactive jousting bouts per match
- [ ] Speed buildup through alternating key taps
- [ ] Front-view lance aiming using mouse
- [ ] Scoring: 3 pts knock-off, 2 pts break, 1 pt hit, -1 pt miss

### Visuals and Animation

- [x] Pixelation shader for retro aesthetic
- [ ] Animated spectators in red and blue
- [x] Red/blue team color markers (bandanas and lance stripes)
- [ ] Dismount and collision animations

### UI and Feedback

- [ ] MPH meter display during movement
- [ ] On-screen scoring and bout tracker
- [ ] Lance icon visual feedback for break states
- [ ] Mouse-based highlighting of strike zones

### Audio

- [ ] Medieval looped music
- [ ] Horse gallop, lance break, and crowd reaction sounds
- [ ] Toggle for muting audio and music

---

## Future Expansions

- [ ] RPG progression with knight upgrades
- [ ] Tournament bracket with escalating opponents
- [ ] Unlockable armor and lance cosmetics
- [ ] Dialogue and story mode with rise-to-noble arc

- [x] Make the camera attached to the head, rotate between -45 and 45 horizontally. The head/neck will rotate with the rotation of the camera
- [x] Make the lance move with the hand/arm of the knight
- [] Make the feet of the knight saddle the horse
- [] Add skeleton highlighting (face,body)

THEN

- Collision, points system
- Sound effects + music
- Round system
- After a round, do what currently is done, but have them finish the run, then walk offscreen, and then appear at the opposite side of the screen (like pacman) walk into place, and then start countdown for next round.
- Show UI of points as lances
- Add shields to the top of the UI and medievalize the UI

EXTRA

- Add crossing lances animation as the countdown alternative
- Add the pan to the king with an animation deciding who won (create two animations, one where he picks one side, the other the other side)
- Add an end screen after the bout is done with the winning lance shaking his head yes in excitement and the loser shaking their head no defeated (like melee endscreens)
- Figure out scaling to different viewports
