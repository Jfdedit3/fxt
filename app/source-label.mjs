export function sourceLabel(value, language = "en") {
  if (typeof value !== "string" || language !== "fr") return value;
  const relative = /^(?:(Streamed|Premiered)\s+)?(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago(\s*\(edited\))?$/i.exec(value.trim());
  if (relative) {
    const number = Number(relative[2]); const units = { second: "seconde", minute: "minute", hour: "heure", day: "jour", week: "semaine", month: "mois", year: "an" }; const unit = units[relative[3].toLowerCase()];
    return `${relative[1] ? relative[1].toLowerCase() === "streamed" ? "Diffusé · " : "Première · " : ""}il y a ${new Intl.NumberFormat("fr-FR").format(number)} ${unit}${number > 1 && unit !== "mois" ? "s" : ""}${relative[4] ? " (modifié)" : ""}`;
  }
  const count = /^(\d[\d,]*(?:\.\d+)?)\s*([KMB])?\s+(subscribers?|videos?|views?|likes?)$/i.exec(value.trim());
  if (count) {
    const number = Number(count[1].replace(/,/g, "")), suffix = count[2]?.toUpperCase();
    const singular = !suffix && number === 1;
    const word = count[3].toLowerCase();
    const noun = word.startsWith("subscriber") ? singular ? "abonné" : "abonnés" : word.startsWith("video") ? singular ? "vidéo" : "vidéos" : word.startsWith("view") ? singular ? "vue" : "vues" : "J’aime";
    return `${new Intl.NumberFormat("fr-FR").format(number)}${suffix ? `\u00a0${{ K: "k", M: "M", B: "Md" }[suffix]}` : ""} ${noun}`;
  }
  return value.replace(/\bNo subscribers\b/gi, "Aucun abonné").replace(/\bNo views\b/gi, "Aucune vue").replace(/\bsubscribers?\b/gi, "abonnés").replace(/\bvideos?\b/gi, "vidéos").replace(/\bviews?\b/gi, "vues").replace(/\blikes?\b/gi, "J’aime").replace(/\(edited\)/gi, "(modifié)").replace(/(\d)\.(\d)/g, "$1,$2").replace(/(\d)\s*([KMB])\b/g, (_m, n, unit) => `${n}\u00a0${{ K: "k", M: "M", B: "Md" }[unit]}`);
}
