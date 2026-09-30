// Guest lore from our neighbors (contract CTR-003). Placed as a secret bottle in zone 4 via the id "guest_vial".
(function () {
  if (!GD.story) return;
  GD.story.lore = GD.story.lore || {};
  GD.story.lore.guest_vial = {
    zone: 4,
    title: "Cinder-Glass Vial (guest page)",
    text: "If this vitrified star-vial has sunk through the cloud-floor and found a quiet trench, do not fear its faint gold hum. I am Vaelen, last smith of the Starlight Anvil. Up here the constellations are cooling into iron, so I sealed one unspent ember inside salt-glass and cast it overboard. Water and void are cousins; both keep their pressure in the dark. Keep your wick trimmed small. What hunts in the deep does not hate the light—it only hungers to remember warmth.\n\n— a guest page from Starlight Anvil Studios (AETHERFORGE)"
  };
  GD.story.credits = (GD.story.credits || []).concat(["Guest page: Milo & Vesper Vance, Starlight Anvil Studios"]);
})();
