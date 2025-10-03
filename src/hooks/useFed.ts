export async function fetchMeetings() {
  try {
    const res = await fetch("/api/fed");
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    throw new Error(err.message || "Failed to fetch meetings");
  }
}
