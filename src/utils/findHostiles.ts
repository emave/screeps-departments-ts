export const findHostilesInRoom = (room: Room): Creep[] => {
  return room.find(FIND_HOSTILE_CREEPS);
};

export const findHostilesInAllSpawnsRooms = (): { room: string; hostiles: Creep[] }[] => {
  return Object.values(Game.spawns)
    .map((spawn: StructureSpawn) => ({
      room: spawn.room.name,
      hostiles: findHostilesInRoom(spawn.room)
    }))
    .filter(({ hostiles }) => hostiles.length > 0);
};
