import type { ImageSourcePropType } from "react-native";

const CLUB_TYPE_IMAGES: Record<string, ImageSourcePropType> = {
  aikido: require("../assets/club-types/aikido.png"),
  basketball: require("../assets/club-types/basketball.png"),
  bjj: require("../assets/club-types/bjj.png"),
  boxing: require("../assets/club-types/boxing.png"),
  capoeira: require("../assets/club-types/capoeira.png"),
  climbing: require("../assets/club-types/climbing.png"),
  crossfit: require("../assets/club-types/crossfit.png"),
  football: require("../assets/club-types/football.png"),
  general_gym: require("../assets/club-types/general_gym.png"),
  gymnastics: require("../assets/club-types/gymnastics.png"),
  handball: require("../assets/club-types/handball.png"),
  hybrid: require("../assets/club-types/hybrid.png"),
  judo: require("../assets/club-types/judo.png"),
  karate: require("../assets/club-types/karate.png"),
  krav_maga: require("../assets/club-types/krav_maga.png"),
  kung_fu: require("../assets/club-types/kung_fu.png"),
  mma: require("../assets/club-types/mma.png"),
  muay_thai: require("../assets/club-types/muay_thai.png"),
  parkour: require("../assets/club-types/parkour.png"),
  swimming: require("../assets/club-types/swimming.png"),
  taekwondo: require("../assets/club-types/taekwondo.png"),
  tennis: require("../assets/club-types/tennis.png"),
  volleyball: require("../assets/club-types/volleyball.png"),
  weightlifting: require("../assets/club-types/weightlifting.png"),
  wrestling: require("../assets/club-types/wrestling.png"),
};

export function getClubTypeImageSource(id: string): ImageSourcePropType | undefined {
  return CLUB_TYPE_IMAGES[id];
}
