import type { TFunction } from "i18next";

/** "Até esforço moderado (Z2)": a zona sempre com o nome do esforço. */
export const zoneUpTo = (t: TFunction, zone: string) =>
  t("panel.zone", { zone, level: t(`panel.zoneNames.${zone}`, { defaultValue: zone }) });
