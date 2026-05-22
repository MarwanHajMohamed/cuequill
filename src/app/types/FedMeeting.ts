export interface FedMeeting {
  meetingDt: string;
  status: string;
  offsetDayCount: number;
  /** "meeting" = rate decision day; "minutes" = minutes release day */
  type?: "meeting" | "minutes";
}

export interface FedMeetingsResponse {
  payload: FedMeeting[];
  metadata: {
    pageSize: number;
    totalElements: number;
    elementsInResponse: number;
    pageNumber: number;
    totalPages: number;
  };
}
