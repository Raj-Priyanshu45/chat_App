import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdMeetingRoom } from 'react-icons/md';
import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';
import { joinChatApi } from '../services/RoomService';
import { getMyActiveRoomsApi } from '../services/MyRoomsService';

/*
 * DM rooms are stored as room_members too, and their id is
 * userA + userB (two Mongo ids glued together). They are opened from the
 * profile / members list, so hide them here.
 */
const isDmRoomId = (roomId, userId) =>
    Boolean(userId) &&
    roomId.length === userId.length * 2 &&
    roomId.includes(userId);

const MyRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState(null);

    const {
        setRoomId,
        setCurrentUser,
        setConnected,
        setRoomUsers,
        setIsDm,
        setDmTarget,
    } = useChatContext();

    const auth = useAuth();
    const navigate = useNavigate();

    const currentUserId =
        auth.user?.id ||
        auth.user?.subject ||
        '';

    useEffect(() => {
        if (!auth.authInitialized || !auth.authenticated) {
            return undefined;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const ids = await getMyActiveRoomsApi();

                if (!cancelled) {
                    setRooms(
                        ids.filter(
                            (id) =>
                                typeof id === 'string' &&
                                !isDmRoomId(id, currentUserId)
                        )
                    );
                }
            } catch {
                if (!cancelled) {
                    toast.error('Unable to load your rooms.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [auth.authInitialized, auth.authenticated, currentUserId]);

    const enterRoom = (room, roomId) => {
        setCurrentUser(currentUserId);
        setRoomUsers([]);
        setIsDm(false);
        setDmTarget('');
        setRoomId(room?.roomId || roomId);
        setConnected(true);
        navigate('/chat');
    };

    const handleOpen = async (roomId) => {
        if (!currentUserId) {
            toast.error('Unable to identify the current user.');
            return;
        }

        setJoiningId(roomId);

        try {
            let room;

            try {
                room = await joinChatApi(roomId, null);
            } catch (error) {
                if (error?.response?.status === 404) {
                    toast.error('Room not found.');
                    return;
                }

                /*
                 * The join call rejects private rooms without the password
                 * (the backend answers with a 500). Ask once and retry.
                 */
                const password = window.prompt(
                    'Could not open the room. If it is private, enter its password:'
                );

                if (!password) {
                    return;
                }

                try {
                    room = await joinChatApi(roomId, password);
                } catch {
                    toast.error('Wrong password or unable to join.');
                    return;
                }
            }

            enterRoom(room, roomId);
        } finally {
            setJoiningId(null);
        }
    };

    if (loading) {
        return (
            <div className="mt-10 flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-subtle border-t-amber" />
            </div>
        );
    }

    if (rooms.length === 0) {
        return null;
    }

    return (
        <div className="mt-10">

            <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
                Your rooms
            </h3>

            <div className="overflow-hidden rounded-md border border-border-subtle">

                {rooms.map((roomId, index) => (
                    <div
                        key={roomId}
                        className={`flex items-center justify-between px-4 py-3 ${
                            index !== 0
                                ? 'border-t border-border-subtle'
                                : ''
                        }`}
                    >

                <span className="truncate font-mono text-sm text-cream">
              {roomId}
            </span>

                        <button
                            type="button"
                            onClick={() => handleOpen(roomId)}
                            disabled={joiningId === roomId}
                            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs text-muted transition hover:border-amber hover:text-amber disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <MdMeetingRoom size={14} />
                            {joiningId === roomId ? 'Opening…' : 'Open'}
                        </button>

                    </div>
                ))}

            </div>
        </div>
    );
};

export default MyRooms;