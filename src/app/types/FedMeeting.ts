export interface FedMeeting {
  meetingDt: string;
  status: string;
  offsetDayCount: number;
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
