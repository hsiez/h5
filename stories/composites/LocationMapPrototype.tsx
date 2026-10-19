import { LocationMapCard, type LocationMapCardProps } from "../../app/_components/location-map-card";
import styles from "./location-map-prototype.module.css";

export function LocationMapPrototype(props: LocationMapCardProps) {
  return (
    <div className={styles.stage}>
      <p className={styles.intro}>I found this piece at <span className={styles.entity}>⌖ {props.place}</span> on the last day of the trip.</p>
      <LocationMapCard {...props} />
    </div>
  );
}
