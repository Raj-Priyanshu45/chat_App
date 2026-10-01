import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  MdArrowBack,
  MdChatBubbleOutline,
  MdMeetingRoom,
  MdLogout,
  MdCameraAlt,
} from 'react-icons/md';

import Avatar from './Avatar';

import useChatContext from '../context/ChatContext';
import useAuth from '../context/AuthContext';

import {
  getMyProfile,
  uploadProfileImageApi,
} from '../services/ProfileService';

import {
  joinChatApi,
  computeDmRoomId,
} from '../services/RoomService';

import { getUsernamesByIds } from '../services/UserService';

import {
  useAvatars,
  primeAvatar,
} from '../hooks/useAvatars';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [friendNames, setFriendNames] = useState({});
  const [loading, setLoading] = useState(true);

  // Profile image upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  /*
   * INTERNAL ID ONLY
   *
   * This must be the MongoDB Users.id.
   * Do NOT use profile.id because ProfileResponse
   * intentionally does not expose the ID.
   */
  const currentUserId =
      auth.user?.id ||
      auth.user?.subject ||
      '';

  /*
   * Friends contain Mongo user IDs internally.
   *
   * useAvatars turns those IDs into image URLs.
   *
   * This hook MUST be before any early return.
   */
  const avatarOf = useAvatars(
      profile?.friends || []
  );

  useEffect(() => {
    if (!auth.authInitialized) {
      return;
    }

    if (!auth.authenticated) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const data = await getMyProfile();

        if (cancelled) {
          return;
        }

        setProfile(data);

        /*
         * friends contains Mongo user IDs internally.
         * Resolve them to usernames only for display.
         */
        const friendIds = data?.friends || [];

        if (friendIds.length) {
          const names =
              await getUsernamesByIds(friendIds);

          if (!cancelled) {
            setFriendNames(names);
          }
        }
      } catch {
        if (!cancelled) {
          toast.error(
              'Unable to load profile.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    auth.authInitialized,
    auth.authenticated,
    navigate,
  ]);

  /*
   * PROFILE IMAGE UPLOAD
   */
  const handleImageSelect = async (event) => {
    const file =
        event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(
          'Please choose an image file.'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
          'Image must be 5 MB or smaller.'
      );
      return;
    }

    setUploading(true);

    try {
      const response =
          await uploadProfileImageApi(file);

      const imageUri =
          response?.imageUri;

      if (!imageUri) {
        throw new Error(
            'Image URL was not returned by server.'
        );
      }

      /*
       * Update the profile immediately,
       * so the avatar changes without
       * another GET request.
       */
      setProfile((prev) => ({
        ...prev,
        imageUri,
      }));

      /*
       * Update the shared avatar cache immediately.
       *
       * Use currentUserId, NOT profile.id.
       * The current user's Mongo ID is stored in
       * auth.user.id / auth.user.subject.
       */
      primeAvatar(
          currentUserId,
          imageUri
      );

      toast.success(
          'Profile photo updated.'
      );
    } catch (error) {
      const data =
          error?.response?.data;

      toast.error(
          typeof data === 'string'
              ? data
              : error?.message ||
              'Could not upload the photo.'
      );
    } finally {
      setUploading(false);
    }
  };

  /*
   * Start a DM.
   *
   * friendId = Mongo user ID.
   */
  const handleMessageFriend = (friendId) => {
    if (!currentUserId) {
      toast.error(
          'Unable to identify the current user.'
      );
      return;
    }

    if (!friendId) {
      toast.error(
          'Invalid friend.'
      );
      return;
    }

    setCurrentUser(currentUserId);

    // Internal target = Mongo ID
    setDmTarget(friendId);

    // Internal room ID = based on Mongo IDs
    setRoomId(
        computeDmRoomId(
            currentUserId,
            friendId
        )
    );

    setRoomUsers([]);
    setIsDm(true);
    setConnected(true);

    navigate('/chat');
  };

  /*
   * Rejoin room.
   */
  const handleRejoinRoom = async (roomId) => {
    if (!currentUserId) {
      toast.error(
          'Unable to identify the current user.'
      );
      return;
    }

    try {
      const room =
          await joinChatApi(
              roomId,
              null
          );

      setCurrentUser(
          currentUserId
      );

      /*
       * Current room members are
       * Mongo IDs.
       */
      setRoomUsers(
          room?.avlUser || []
      );

      setIsDm(false);
      setDmTarget('');

      setRoomId(
          room?.roomId ||
          roomId
      );

      setConnected(true);

      navigate('/chat');
    } catch (error) {
      const message =
          typeof error?.response?.data === 'string'
              ? error.response.data
              : 'Unable to rejoin room.';

      toast.error(message);
    }
  };

  /*
   * Logout.
   */
  const handleLogout = async () => {
    setConnected(false);
    setRoomId('');
    setCurrentUser('');
    setRoomUsers([]);
    setIsDm(false);
    setDmTarget('');

    await auth.logout();

    navigate(
        '/login',
        { replace: true }
    );
  };

  if (loading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-ink">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-amber" />
        </div>
    );
  }

  if (!profile) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-ink text-sm text-muted">
          Unable to load profile.
        </div>
    );
  }

  const friends =
      profile.friends || [];

  const roomHistory =
      profile.roomHistory || [];

  return (
      <div className="min-h-screen bg-ink px-6 py-10 text-cream">

        <div className="mx-auto max-w-xl">

          {/* Back */}

          <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-8 flex items-center gap-1 text-sm text-muted transition hover:text-cream"
          >
            <MdArrowBack size={16} />
            Back
          </button>

          {/* ========================= */}
          {/* PROFILE HEADER             */}
          {/* ========================= */}

          <div className="mb-8 flex items-center gap-4 border-b border-border-subtle pb-8">

            {/* Profile image */}

            <div className="relative shrink-0">

              <button
                  type="button"
                  onClick={() =>
                      fileInputRef.current?.click()
                  }
                  disabled={uploading}
                  title="Change photo"
                  className="group relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-surface-raised text-xl font-semibold text-amber disabled:cursor-not-allowed"
              >

                {profile.imageUri ? (
                    <img
                        src={profile.imageUri}
                        alt="Profile"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    (
                        profile.name ||
                        profile.username ||
                        '?'
                    )[0]?.toUpperCase()
                )}

                {/* Hover / upload overlay */}

                <span
                    className={`absolute inset-0 flex items-center justify-center bg-black/60 text-cream transition ${
                        uploading
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                    }`}
                >

                  {uploading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-subtle border-t-amber" />
                  ) : (
                      <MdCameraAlt
                          size={18}
                      />
                  )}

                </span>

              </button>

              {/* Hidden file picker */}

              <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                  onChange={handleImageSelect}
                  className="hidden"
              />

            </div>

            {/* Profile information */}

            <div className="min-w-0">

              <h1 className="truncate text-lg font-semibold text-cream">
                {profile.name ||
                    profile.username}
              </h1>

              {/* Username is visible to the user */}

              <p className="font-mono text-sm text-muted">
                @{profile.username}
              </p>

              {profile.gmail && (
                  <p className="truncate text-xs text-muted">
                    {profile.gmail}
                  </p>
              )}

            </div>

            {/* Logout */}

            <button
                type="button"
                onClick={handleLogout}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs text-rose transition hover:border-rose"
            >
              <MdLogout size={14} />
              Log out
            </button>

          </div>

          {/* ========================= */}
          {/* FRIENDS                    */}
          {/* ========================= */}

          <div className="mb-8">

            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
              Friends
            </h2>

            {friends.length === 0 ? (
                <p className="text-sm text-muted">
                  No friends yet — message someone to add them here.
                </p>
            ) : (
                <div className="overflow-hidden rounded-md border border-border-subtle">

                  {friends.map(
                      (friendId, index) => {

                        /*
                         * friendId = internal Mongo ID
                         *
                         * friendNames[friendId]
                         * = username shown to user
                         */
                        const username =
                            friendNames[friendId] ||
                            'Unknown user';

                        return (
                            <div
                                key={friendId}
                                className={`flex items-center justify-between px-4 py-3 ${
                                    index !== 0
                                        ? 'border-t border-border-subtle'
                                        : ''
                                }`}
                            >

                              <div className="flex items-center gap-3">

                                <Avatar
                                    src={avatarOf(friendId)}
                                    name={username}
                                    size={32}
                                />

                                {/* USERNAME DISPLAY */}

                                <span className="font-mono text-sm text-cream">
                                  {username}
                                </span>

                              </div>

                              <button
                                  type="button"
                                  onClick={() =>
                                      handleMessageFriend(
                                          friendId
                                      )
                                  }
                                  className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs text-muted transition hover:border-amber hover:text-amber"
                              >
                                <MdChatBubbleOutline
                                    size={14}
                                />
                                Message
                              </button>

                            </div>
                        );
                      }
                  )}

                </div>
            )}

          </div>

          {/* ========================= */}
          {/* ROOM HISTORY               */}
          {/* ========================= */}

          <div>

            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted">
              Room history
            </h2>

            {roomHistory.length === 0 ? (
                <p className="text-sm text-muted">
                  No rooms joined yet — create or join one to see it here.
                </p>
            ) : (
                <div className="overflow-hidden rounded-md border border-border-subtle">

                  {roomHistory.map(
                      (historyRoomId, index) => (

                          <div
                              key={historyRoomId}
                              className={`flex items-center justify-between px-4 py-3 ${
                                  index !== 0
                                      ? 'border-t border-border-subtle'
                                      : ''
                              }`}
                          >

                            <span className="font-mono text-sm text-cream">
                              {historyRoomId}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    handleRejoinRoom(
                                        historyRoomId
                                    )
                                }
                                className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-xs text-muted transition hover:border-amber hover:text-amber"
                            >
                              <MdMeetingRoom
                                  size={14}
                              />
                              Rejoin
                            </button>

                          </div>
                      )
                  )}

                </div>
            )}

          </div>

        </div>
      </div>
  );
};

export default Profile;