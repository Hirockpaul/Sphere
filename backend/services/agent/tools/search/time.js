const LOCATION_TIMEZONES = new Map([
  ["india", "Asia/Kolkata"],
  ["delhi", "Asia/Kolkata"],
  ["mumbai", "Asia/Kolkata"],
  ["kolkata", "Asia/Kolkata"],
  ["bengaluru", "Asia/Kolkata"],
  ["bangalore", "Asia/Kolkata"],
  ["london", "Europe/London"],
  ["united kingdom", "Europe/London"],
  ["new york", "America/New_York"],
  ["los angeles", "America/Los_Angeles"],
  ["chicago", "America/Chicago"],
  ["tokyo", "Asia/Tokyo"],
  ["japan", "Asia/Tokyo"],
  ["sydney", "Australia/Sydney"],
  ["dubai", "Asia/Dubai"],
  ["singapore", "Asia/Singapore"],
  ["utc", "UTC"],
]);

const getTimeZoneName = (timeZone) => {
  const part = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(new Date()).find(({ type }) => type === "timeZoneName");

  return part?.value || timeZone;
};

const resolveLocation = (prompt) => {
  const query = prompt.toLowerCase();
  const explicitTimeZone = Intl.supportedValuesOf("timeZone")
    .find((timeZone) => query.includes(timeZone.toLowerCase()));

  if (explicitTimeZone) {
    return {
      location: explicitTimeZone,
      timeZone: explicitTimeZone,
    };
  }

  for (const [location, timeZone] of LOCATION_TIMEZONES) {
    if (query.includes(location)) {
      return {
        location: location.replace(/\b\w/g, (letter) => letter.toUpperCase()),
        timeZone,
      };
    }
  }

  return null;
};

export const getCurrentTime = (prompt) => {
  try {
    const resolved = resolveLocation(prompt);
    if (!resolved) {
      return {
        type: "time",
        status: "error",
        error: "Please specify a supported location or IANA timezone, such as India or Asia/Kolkata.",
      };
    }

    const now = new Date();
    return {
      type: "time",
      status: "success",
      timezone: resolved.timeZone,
      timezoneName: getTimeZoneName(resolved.timeZone),
      location: resolved.location,
      currentTime: new Intl.DateTimeFormat("en-IN", {
        timeZone: resolved.timeZone,
        timeStyle: "long",
      }).format(now),
      currentDate: new Intl.DateTimeFormat("en-IN", {
        timeZone: resolved.timeZone,
        dateStyle: "full",
      }).format(now),
    };
  } catch {
    return {
      type: "time",
      status: "error",
      error: "The current time could not be calculated for that location.",
    };
  }
};

export const timeTool = async (state) => ({
  ...state,
  toolResult: getCurrentTime(state.prompt),
  searchResults: [],
  images: [],
});
