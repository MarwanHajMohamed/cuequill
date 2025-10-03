export interface FedMeeting {
  meetingDt: string;
  status: string;
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
