export function calculatePartsPrice(parts: BodyPartConstant[]): number {
  return parts.reduce((total, part) => {
    switch (part) {
      case MOVE:
        return total + 50;
      case WORK:
        return total + 100;
      case CARRY:
        return total + 50;
      case ATTACK:
        return total + 80;
      case RANGED_ATTACK:
        return total + 150;
      case HEAL:
        return total + 250;
      case CLAIM:
        return total + 600;
      case TOUGH:
        return total + 10;
      default:
        return total;
    }
  }, 0);
}
