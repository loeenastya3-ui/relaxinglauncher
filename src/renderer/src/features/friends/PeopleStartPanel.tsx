import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import {
  CircleAlert,
  Copy,
  Gamepad2,
  Globe,
  MessagesSquare,
  Play,
  RotateCw,
  Send,
  UserRound,
  UserPlus,
  Users,
} from "lucide-react";
import { HeadDot, PlayerHead } from "@renderer/features/accounts/AccountHead";
import {
  communityUserToIUser,
  loadCommunityIndex,
} from "@renderer/features/community/staticCommunity";
import { Button } from "@/components/ui/button";
import { Hint } from "@renderer/components/Hint";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@renderer/utilities/date";
import { canJoinFriend, presenceDotColor } from "./presence";
import { PlatformIcon } from "./PlatformIcon";
import type { FriendEntry } from "./friendsList";
import { useRedact } from "@renderer/features/streamer/streamerMode";

interface PeopleStartPanelProps {
  playing: FriendEntry[];
  chats: FriendEntry[];
  hasFriends: boolean;
  isSignedOut: boolean;
  isLoading: boolean;
  listError?: string | null;
  summaryError?: string | null;
  isSummaryPending?: boolean;
  onReloadFriends: () => void;
  isGameRunning: boolean;
  ownFriendCode?: string;
  friendRequestsEnabled: boolean;
  onSignIn: () => void;
  onViewProfile: (id: string) => void;
  describePresence: (entry: FriendEntry) => string;
  describeChat: (entry: FriendEntry) => string;
  onJoin: (friendId: string) => void;
  onInvite: (friendId: string) => void;
  onOpenChat: (friendId: string) => void;
  onAddFriend: () => void;
  onCopyCode: () => void;
  t: TFunction;
}

function CommunityCatalog({
  onViewProfile,
  t,
}: {
  onViewProfile: (id: string) => void;
  t: TFunction;
}) {
  const index = useQuery({
    queryKey: ["community", "index"],
    queryFn: () => loadCommunityIndex(true),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
  const users = index.data?.users ?? [];
  const isLoading = index.isPending && users.length === 0;
  const isEmpty = !isLoading && users.length === 0;

  return (
    <section className="flex min-h-24 flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex shrink-0 items-center gap-2">
        <Globe className="size-4 text-faint" />
        <p className="text-sm font-medium">{t("people.title")}</p>
        <span className="font-mono text-xs tabular-nums text-faint">
          {users.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }).map((_, rowIndex) => (
            <div
              key={`community-skeleton-${rowIndex}`}
              className="flex h-11 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5"
            >
              <Skeleton className="size-7 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-2.5 w-36 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <p className="px-0.5 text-xs leading-4 text-muted-foreground">
          {t("people.emptyHint")}
        </p>
      ) : (
        <div className="flex max-h-56 min-h-0 flex-col gap-1.5 overflow-y-auto">
          {users.map((user) => {
            const head = communityUserToIUser(user);
            return (
              <div
                key={user.id}
                role="button"
                tabIndex={0}
                className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onViewProfile(user.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onViewProfile(user.id);
                  }
                }}
              >
                <PlayerHead user={head} size={28} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {user.nickname}
                  </span>
                  {user.bio && (
                    <span className="min-w-0 truncate text-[11px] leading-4 text-muted-foreground">
                      {user.bio}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={t("people.viewProfile")}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewProfile(user.id);
                  }}
                >
                  <UserRound className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="shrink-0 px-0.5 text-[11px] leading-4 text-muted-foreground">
        {t("people.offlineHint")}
      </p>
    </section>
  );
}

function FriendCard({
  entry,
  isGameRunning,
  detail,
  meta,
  onJoin,
  onInvite,
  onOpenChat,
  t,
}: {
  entry: FriendEntry;
  isGameRunning: boolean;
  detail: string;
  meta?: string;
  onJoin: (friendId: string) => void;
  onInvite: (friendId: string) => void;
  onOpenChat: (friendId: string) => void;
  t: TFunction;
}) {
  const { friend, presence, unread } = entry;
  const id = friend.user._id;
  const canJoin = canJoinFriend(presence, isGameRunning);
  const canInvite = !canJoin && friend.isOnline && isGameRunning;

  return (
    <div className="flex h-14 min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5 transition-colors hover:bg-surface-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpenChat(id)}
      >
        <PlayerHead
          user={friend.user}
          size={36}
          badge={<HeadDot className={presenceDotColor(presence.kind)} />}
        />

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-sm font-medium">
              {friend.user.nickname}
            </span>
            <span className="shrink-0 text-faint">
              <PlatformIcon platform={friend.user.platform} />
            </span>
            {meta && (
              <span className="ml-auto shrink-0 text-[10px] text-faint">
                {meta}
              </span>
            )}
          </span>
          <Hint content={detail} variant="text" truncatedOnly>
            <span className="min-w-0 truncate text-[11px] leading-4 text-muted-foreground">
              {detail}
            </span>
          </Hint>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {unread > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-soft-raised px-1 font-mono text-[10px] leading-none tabular-nums text-primary">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        {canJoin && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={() => onJoin(id)}
          >
            <Play className="size-3" />
            {t("friends.joinFlow.playAction")}
          </Button>
        )}
        {canInvite && (
          <Button
            size="icon-sm"
            variant="outline"
            className="size-7"
            aria-label={t("friends.invite")}
            onClick={() => onInvite(id)}
          >
            <Send className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function PeopleStartPanel({
  playing,
  chats,
  hasFriends,
  isSignedOut,
  isLoading,
  listError,
  summaryError,
  isSummaryPending,
  onReloadFriends,
  isGameRunning,
  ownFriendCode,
  friendRequestsEnabled,
  describePresence,
  describeChat,
  onJoin,
  onInvite,
  onOpenChat,
  onAddFriend,
  onCopyCode,
  onSignIn,
  onViewProfile,
  t,
}: PeopleStartPanelProps) {
  const redact = useRedact();
  const hasContent = hasFriends || playing.length > 0 || chats.length > 0;
  const chatTime = (value: string | null | undefined) =>
    value ? formatRelative(new Date(value)) : "";
  const reasonOf = (code: string) => {
    const key = `friends.operationErrors.${code}`;
    const text = t(key);
    return text === key ? t("friends.operationErrors.unknown") : text;
  };

  if (isSignedOut && !hasContent) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-3">
        <CommunityCatalog onViewProfile={onViewProfile} t={t} />
        <Button variant="secondary" onClick={onSignIn}>
          {t("accounts.signIn")}
        </Button>
      </section>
    );
  }

  if (listError && !hasContent) {
    const reason = reasonOf(listError);

    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-surface-3">
          <CircleAlert className="size-5 text-warning" />
        </span>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t("friends.listLoadError")}</p>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            {reason}
          </p>
        </div>

        <Button onClick={onReloadFriends}>
          <RotateCw className="size-4" />
          {t("common.retry")}
        </Button>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      {(isLoading || hasContent) && (
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <Gamepad2 className="size-4 text-faint" />
          <p className="text-sm font-medium">{t("friends.nowPlayingTitle")}</p>
          <span className="font-mono text-xs tabular-nums text-faint">
            {playing.length}
          </span>
        </div>
      )}

      {isLoading && !hasContent ? (
        <div
          aria-busy
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3"
        >
          <div className="grid shrink-0 grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex h-14 min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5"
              >
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-2.5 w-32 rounded" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex shrink-0 flex-col gap-1.5">
            <Skeleton className="h-2.5 w-20 rounded" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex h-14 min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5"
                >
                  <Skeleton className="size-9 shrink-0 rounded-md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-2.5 w-28 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : hasContent ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          {playing.length > 0 ? (
            <div className="min-h-0 overflow-x-hidden overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {playing.map((entry) => (
                  <FriendCard
                    key={entry.friend.user._id}
                    entry={entry}
                    isGameRunning={isGameRunning}
                    detail={describePresence(entry)}
                    onJoin={onJoin}
                    onInvite={onInvite}
                    onOpenChat={onOpenChat}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-dashed border-border px-3 py-2.5">
              <Users className="size-4 shrink-0 text-faint" />
              <p className="min-w-0 text-xs leading-4 text-muted-foreground">
                {t("friends.nobodyPlayingHint")}
              </p>
            </div>
          )}

          {chats.length > 0 ? (
            <div className="flex min-h-0 flex-col gap-1.5">
              <p className="shrink-0 px-0.5 text-[10px] font-medium tracking-wide text-faint uppercase">
                {t("friends.recentTitle")}
              </p>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {chats.map((entry) => (
                    <FriendCard
                      key={entry.friend.user._id}
                      entry={entry}
                      isGameRunning={isGameRunning}
                      detail={describeChat(entry)}
                      meta={chatTime(entry.preview?.time)}
                      onJoin={onJoin}
                      onInvite={onInvite}
                      onOpenChat={onOpenChat}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : isSummaryPending ? (
            <div className="flex min-h-0 flex-col gap-1.5">
              <p className="shrink-0 px-0.5 text-[10px] font-medium tracking-wide text-faint uppercase">
                {t("friends.recentTitle")}
              </p>
              <div aria-busy className="grid shrink-0 grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-14 min-w-0 items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5"
                  >
                    <Skeleton className="size-9 shrink-0 rounded-md" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-24 rounded" />
                      <Skeleton className="h-2.5 w-28 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : summaryError ? (
            <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-dashed border-border py-1.5 pr-1.5 pl-3">
              <CircleAlert className="size-4 shrink-0 text-warning" />
              <p className="min-w-0 flex-1 text-xs leading-4 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("friends.chatsLoadError")}
                </span>{" "}
                {reasonOf(summaryError)}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                onClick={onReloadFriends}
              >
                <RotateCw className="size-3.5" />
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-dashed border-border px-3 py-2.5">
              <MessagesSquare className="size-4 shrink-0 text-faint" />
              <p className="min-w-0 text-xs leading-4 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("friends.noChatsTitle")}
                </span>{" "}
                {t("friends.noChatsHint")}
              </p>
            </div>
          )}

          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-6 py-3 text-center">
            <p className="text-sm font-medium">{t("friends.friendCode")}</p>

            {ownFriendCode && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-1.5">
                <span className="font-mono text-lg font-semibold tracking-[0.14em] select-all">
                  {redact.value(ownFriendCode)}
                </span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-6"
                  aria-label={t("common.copy")}
                  onClick={onCopyCode}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            )}

            {!ownFriendCode ? (
              <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                {t("friends.friendCodeUnavailable")}
              </p>
            ) : friendRequestsEnabled ? (
              <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                {t("friends.friendCodeDescription")}
              </p>
            ) : (
              <p className="max-w-sm text-xs leading-5 text-warning">
                <CircleAlert className="mr-1 inline size-3.5 -translate-y-px" />
                {t("friends.friendCodeDisabledHint")}
              </p>
            )}

            <Button size="sm" variant="secondary" onClick={onAddFriend}>
              <UserPlus className="size-4" />
              {t("friends.addFriend")}
            </Button>
          </div>

          <CommunityCatalog onViewProfile={onViewProfile} t={t} />
        </div>
      ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-surface-3">
              <Users className="size-5 text-muted-foreground" />
            </span>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t("friends.noFriends")}</p>
              <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                {t("friends.noFriendsHint")}
              </p>
            </div>

            <Button onClick={onAddFriend}>
              <UserPlus className="size-4" />
              {t("friends.addFriend")}
            </Button>

            {ownFriendCode && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5">
                <span className="font-mono text-sm tracking-[0.15em] select-all">
                  {redact.value(ownFriendCode)}
                </span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-6"
                  aria-label={t("common.copy")}
                  onClick={onCopyCode}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            )}

            {ownFriendCode && !friendRequestsEnabled && (
              <p className="max-w-sm text-xs leading-5 text-warning">
                <CircleAlert className="mr-1 inline size-3.5 -translate-y-px" />
                {t("friends.friendCodeDisabledHint")}
              </p>
            )}

            <div className="w-full max-w-md">
              <CommunityCatalog onViewProfile={onViewProfile} t={t} />
            </div>
          </div>
        )}
    </section>
  );
}
