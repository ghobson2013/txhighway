To do list

Design
===

- [X] Adjust sprites with static height
- [X] Modal revisions
- [ ] Optimize PNG's
- [ ] (maybe) Make Tuktuk (see first item in development. HURRAY!)
- [X] Create legend for identifying vehicles
- [ ] Create speed limit signs (3tx/sec BTC versus 24tx/sec - 96tx/sec BCH)

Development 
===

- [ ] (maybe) Look into converting BTC mempool data & websockets to blockchain.info... they show witness data!
- [X] Fix Lambos - Donations to BCH
- [X] Adjust distance off screen where vehicles are loaded (trucks just 'appear' and don't roll in from the side)
- [X] JS bug - Animation pauses when window looses focus. Destroy vehicles to prevent pile up on focus.
- [X] Prevent BCH vehicle collisions (if BCH tx come to close together and RNG puts them in same lane - allows for more tx/scaling)
- [X] Setup popup for when blocks are found "xx BCH/BTC transactions have confirmed arrival"
- [X] Use average confirmation time (BCH is always < 10min) - use for BTC https://api.blockchain.info/charts/avg-confirmation-time
- [X] Fix sound bug. Sometimes vehicles dont make a sound
- [X] Fix audio playback on mobile devices
- [X] Loading overlay to give the cars a chance to catch up before fading away.
- [X] Options (Mute/Hide overlays)
- [X] Fix number format to thousands
- [ ] (Maybe) On click pause / reposition vehicle so it floats above the rest, data infowindow (tx id, fee, etc)
- [X] Map audio to sprites
- [ ] Add mobile styles
- [ ] Cross browser test

