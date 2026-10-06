import { httpClient } from '../config/AxiosHelper';

// Full path of your POST /ret-rooms endpoint (class-level @RequestMapping + "/ret-rooms").
// Change this one line if your controller is mapped differently.
const MY_ROOMS_URL = '/api/v1/ret-rooms';

// Returns the room ids the current user is an active member of.
export const getMyActiveRoomsApi = async () => {
    const response = await httpClient.post(MY_ROOMS_URL);
    return response.data || [];
};