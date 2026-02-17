import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Typography,
  Card,
  Stack,
  IconButton,
  Avatar,
  TextField,
  Badge,
  useTheme,
  Skeleton,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  CaretLeft,
  PaperPlaneRight,
  ChatCircleDots,
  UsersThree,
  ArrowsClockwise,
  Trash,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api, { API_BASE } from "../api";
import useAuthStore from "../store/auth";
import useSync from "../hooks/useSync";

// ─── Helpers ───
const getInitials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const USER_COLORS = [
  "#0b57d0",
  "#b5179e",
  "#e65100",
  "#1b5e20",
  "#1565c0",
  "#c62828",
  "#6a1b9a",
  "#00695c",
];

const getUserColor = (id) => USER_COLORS[(id || 0) % USER_COLORS.length];

const getAvatarUrl = (pic) => {
  if (!pic) return null;
  if (pic.startsWith("http")) return pic;
  return `${API_BASE}/../uploads/${pic}`;
};

const formatTime = (dateStr) => {
  try {
    const d = new Date(
      dateStr + (dateStr.includes("T") || dateStr.includes("Z") ? "" : " UTC"),
    );
    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

const formatDateLabel = (dateStr) => {
  try {
    const d = new Date(
      dateStr + (dateStr.includes("T") || dateStr.includes("Z") ? "" : " UTC"),
    );
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

// Simple linkify for URLs
const linkify = (text) => {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlPattern,
    '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">$1</a>',
  );
};

// ─── Views ───
const VIEW = { CONVERSATIONS: "conversations", GROUP: "group", DM: "dm" };

// ─── Refresh Button ───
const RefreshButton = ({ theme, onRefresh }) => {
  const [cooldown, setCooldown] = useState(false);

  const handleClick = () => {
    if (cooldown) return;
    onRefresh?.();
    toast.success("Refreshed");
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
  };

  return (
    <IconButton
      onClick={handleClick}
      disabled={cooldown}
      sx={{
        width: 44,
        height: 44,
        bgcolor: cooldown
          ? alpha(theme.palette.divider, 0.06)
          : alpha(theme.palette.primary.main, 0.06),
        color: cooldown ? "text.disabled" : "primary.main",
        transition: "all 0.2s",
      }}
    >
      <ArrowsClockwise
        size={20}
        weight="bold"
        style={{
          transition: "transform 0.5s ease",
          transform: cooldown ? "rotate(360deg)" : "rotate(0deg)",
        }}
      />
    </IconButton>
  );
};

// ═══════════════════════════════════════════════════
//  MAIN CHAT COMPONENT
// ═══════════════════════════════════════════════════
const Chat = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mode = theme.palette.mode;
  const { user } = useAuthStore();
  const myId = user?.id;
  const { refresh: refreshSync } = useSync();

  const [view, setView] = useState(VIEW.GROUP);
  const [dmUserId, setDmUserId] = useState(null);
  const [dmUserName, setDmUserName] = useState("");
  const [dmUserPic, setDmUserPic] = useState(null);

  // ─── Conversations List ───
  const { data: convData, refetch: refetchConversations } = useQuery({
    queryKey: ["chatConversations"],
    queryFn: () => api.get("/chat/conversations"),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const conversations = convData?.conversations || [];
  const groupUnread = convData?.group_unread || 0;
  const groupLastMsg = convData?.group_last_message || null;

  const openDm = (userId, name, pic) => {
    setDmUserId(userId);
    setDmUserName(name);
    setDmUserPic(pic);
    setView(VIEW.DM);
    api.post("/chat/mark-read", { type: "dm", user_id: userId }).then(() => {
      queryClient.invalidateQueries(["chatConversations"]);
    });
  };

  const openGroup = () => {
    setView(VIEW.GROUP);
    api.post("/chat/mark-read", { type: "group" }).then(() => {
      queryClient.invalidateQueries(["chatConversations"]);
    });
  };

  const showConversations = () => {
    setView(VIEW.CONVERSATIONS);
    queryClient.invalidateQueries(["chatConversations"]);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          pt: 3,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton
            onClick={() => {
              if (view === VIEW.DM || view === VIEW.GROUP) showConversations();
              else navigate(-1);
            }}
            sx={{
              width: 44,
              height: 44,
              bgcolor: "background.paper",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <CaretLeft size={20} weight="bold" />
          </IconButton>

          {/* Show avatar for DM */}
          {view === VIEW.DM && dmUserPic && (
            <Avatar
              src={getAvatarUrl(dmUserPic)}
              sx={{
                width: 36,
                height: 36,
                border: `2px solid ${alpha(getUserColor(dmUserId), 0.3)}`,
              }}
            >
              {getInitials(dmUserName)}
            </Avatar>
          )}
          {view === VIEW.GROUP && (
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: "primary.main",
              }}
            >
              <UsersThree size={18} weight="duotone" />
            </Avatar>
          )}

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.2 }}
            >
              {view === VIEW.GROUP
                ? "Group Chat"
                : view === VIEW.DM
                  ? dmUserName
                  : "Messages"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                fontSize: "0.6rem",
              }}
            >
              {view === VIEW.GROUP
                ? "Everyone in your space"
                : view === VIEW.DM
                  ? "Direct message"
                  : "Group & Direct Messages"}
            </Typography>
          </Box>
        </Stack>

        {/* Header actions */}
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Manual Refresh */}
          <RefreshButton theme={theme} onRefresh={refreshSync} />

          {/* Conversations toggle */}
          {view !== VIEW.CONVERSATIONS && (
            <IconButton
              onClick={showConversations}
              sx={{
                width: 44,
                height: 44,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: "primary.main",
              }}
            >
              <ChatCircleDots size={20} weight="bold" />
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AnimatePresence mode="wait">
          {view === VIEW.CONVERSATIONS && (
            <motion.div
              key="conv"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ flex: 1, overflow: "auto" }}
            >
              <ConversationList
                conversations={conversations}
                groupUnread={groupUnread}
                groupLastMsg={groupLastMsg}
                openDm={openDm}
                openGroup={openGroup}
                myId={myId}
                theme={theme}
                mode={mode}
              />
            </motion.div>
          )}

          {view === VIEW.GROUP && (
            <motion.div
              key="group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <ChatThread
                endpoint="/chat/messages"
                queryKey={["chatGroup"]}
                myId={myId}
                isGroup
                theme={theme}
                mode={mode}
              />
            </motion.div>
          )}

          {view === VIEW.DM && dmUserId && (
            <motion.div
              key={`dm-${dmUserId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <ChatThread
                endpoint={`/chat/dm?user_id=${dmUserId}`}
                queryKey={["chatDm", dmUserId]}
                myId={myId}
                recipientId={dmUserId}
                theme={theme}
                mode={mode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════
//  CONVERSATION LIST
// ═══════════════════════════════════════════════════
const ConversationList = ({
  conversations,
  groupUnread,
  groupLastMsg,
  openDm,
  openGroup,
  myId,
  theme,
  mode,
}) => {
  return (
    <Box sx={{ px: 2, pt: 1, pb: 4 }}>
      {/* Group Chat Card */}
      <Box
        onClick={openGroup}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2,
          mb: 1,
          borderRadius: "18px",
          cursor: "pointer",
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
          transition: "all 0.15s ease",
          "&:active": { transform: "scale(0.98)" },
        }}
      >
        <Badge
          badgeContent={groupUnread}
          color="error"
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              fontWeight: 800,
              fontSize: "0.65rem",
              minWidth: 20,
              height: 20,
            },
          }}
        >
          <Avatar
            sx={{
              width: 52,
              height: 52,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
              fontWeight: 900,
            }}
          >
            <UsersThree size={26} weight="duotone" />
          </Avatar>
        </Badge>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>
              Group Chat
            </Typography>
            {groupLastMsg && (
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  color: "text.disabled",
                  flexShrink: 0,
                }}
              >
                {formatTime(groupLastMsg.created_at)}
              </Typography>
            )}
          </Stack>
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: groupUnread > 0 ? "text.primary" : "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              mt: 0.3,
            }}
          >
            {groupLastMsg
              ? `${groupLastMsg.sender_id == myId ? "You" : groupLastMsg.name}: ${groupLastMsg.message}`
              : "No messages yet"}
          </Typography>
        </Box>
      </Box>

      {/* Section label */}
      <Typography
        variant="overline"
        sx={{
          fontWeight: 800,
          color: "text.secondary",
          letterSpacing: "1px",
          mt: 2,
          mb: 1,
          display: "block",
          px: 1,
          fontSize: "0.6rem",
        }}
      >
        DIRECT MESSAGES
      </Typography>

      {/* DM Threads */}
      <Stack spacing={0.8}>
        {conversations.map((conv) => {
          const m = conv.user;
          const last = conv.last_message;
          const unread = conv.unread;
          const color = getUserColor(m.id);
          const avatarUrl = getAvatarUrl(m.profile_picture);

          return (
            <Box
              key={m.id}
              onClick={() => openDm(m.id, m.name, m.profile_picture)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 2,
                py: 1.5,
                borderRadius: "16px",
                cursor: "pointer",
                bgcolor:
                  unread > 0
                    ? alpha(theme.palette.primary.main, 0.04)
                    : "transparent",
                border:
                  unread > 0
                    ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                    : `1px solid transparent`,
                transition: "all 0.15s ease",
                "&:active": { transform: "scale(0.98)" },
              }}
            >
              <Badge
                badgeContent={unread}
                color="error"
                overlap="circular"
                sx={{
                  "& .MuiBadge-badge": {
                    fontWeight: 800,
                    fontSize: "0.6rem",
                    minWidth: 18,
                    height: 18,
                  },
                }}
              >
                <Avatar
                  src={avatarUrl}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: alpha(color, 0.15),
                    color,
                    fontWeight: 900,
                    fontSize: "0.8rem",
                  }}
                >
                  {getInitials(m.name)}
                </Avatar>
              </Badge>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    sx={{
                      fontWeight: unread > 0 ? 800 : 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {m.name}
                  </Typography>
                  {last && (
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: "text.disabled",
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(last.created_at)}
                    </Typography>
                  )}
                </Stack>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: unread > 0 ? 700 : 500,
                    color: unread > 0 ? "text.primary" : "text.secondary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    mt: 0.2,
                  }}
                >
                  {last
                    ? `${last.sender_id == myId ? "You: " : ""}${last.message}`
                    : "Start a conversation"}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {conversations.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <ChatCircleDots
              size={36}
              weight="duotone"
              color={theme.palette.text.disabled}
            />
            <Typography
              sx={{
                color: "text.disabled",
                fontWeight: 600,
                mt: 1,
                fontSize: "0.85rem",
              }}
            >
              No group members yet
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

// ═══════════════════════════════════════════════════
//  CHAT THREAD (Group or DM)
// ═══════════════════════════════════════════════════
const ChatThread = ({
  endpoint,
  queryKey,
  myId,
  recipientId,
  isGroup,
  theme,
  mode,
}) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch messages — 15s auto-refresh
  const { data: msgData, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get(endpoint),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const messages = msgData?.messages || [];

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Send message
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    try {
      const body = { message: text };
      if (recipientId) body.recipient_id = recipientId;
      await api.post("/chat/send", body);
      queryClient.invalidateQueries(queryKey);
      queryClient.invalidateQueries(["chatConversations"]);
    } catch {
      toast.error("Failed to send message");
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, recipientId, queryKey, queryClient]);

  // Delete message
  const deleteMsg = useCallback(
    async (msgId) => {
      try {
        await api.post("/chat/delete", { id: msgId });
        queryClient.invalidateQueries(queryKey);
        toast.success("Message deleted");
      } catch {
        toast.error("Couldn't delete");
      }
    },
    [queryKey, queryClient],
  );

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;

    messages.forEach((msg) => {
      const dateLabel = formatDateLabel(msg.created_at);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groups.push({ type: "date", label: dateLabel });
      }
      groups.push({ type: "message", data: msg });
    });

    return groups;
  }, [messages]);

  return (
    <>
      {/* Messages Area */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          pt: 0.5,
          pb: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isLoading ? (
          <Stack spacing={2} sx={{ pt: 4 }}>
            {[1, 2, 3].map((i) => (
              <Stack
                key={i}
                direction="row"
                spacing={1}
                alignItems="flex-end"
                sx={{ alignSelf: i % 2 === 0 ? "flex-end" : "flex-start" }}
              >
                {i % 2 !== 0 && (
                  <Skeleton variant="circular" width={32} height={32} />
                )}
                <Skeleton
                  variant="rounded"
                  width={180}
                  height={50}
                  sx={{ borderRadius: "16px" }}
                />
              </Stack>
            ))}
          </Stack>
        ) : messages.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <ChatCircleDots
              size={48}
              weight="duotone"
              color={theme.palette.text.disabled}
            />
            <Typography
              sx={{
                color: "text.disabled",
                fontWeight: 700,
                mt: 1.5,
                fontSize: "0.9rem",
              }}
            >
              No messages yet
            </Typography>
            <Typography
              sx={{
                color: "text.disabled",
                fontWeight: 500,
                fontSize: "0.75rem",
                mt: 0.5,
              }}
            >
              Say something to start the conversation
            </Typography>
          </Box>
        ) : (
          <>
            {groupedMessages.map((item, idx) => {
              if (item.type === "date") {
                return (
                  <Box key={`date-${idx}`} sx={{ textAlign: "center", my: 2 }}>
                    <Typography
                      sx={{
                        display: "inline-block",
                        px: 2,
                        py: 0.5,
                        borderRadius: "10px",
                        bgcolor: alpha(theme.palette.divider, 0.08),
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: "text.secondary",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                );
              }

              const msg = item.data;
              const isMe = msg.sender_id == myId;
              const color = getUserColor(msg.sender_id);

              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMe={isMe}
                  isGroup={isGroup}
                  color={color}
                  onDelete={isMe ? () => deleteMsg(msg.id) : null}
                  theme={theme}
                  mode={mode}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Input Bar */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          flexShrink: 0,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            variant="outlined"
            InputProps={{
              sx: {
                borderRadius: "20px",
                fontSize: "0.9rem",
                fontWeight: 500,
                py: 1,
                px: 2,
                bgcolor: alpha(theme.palette.divider, 0.04),
                "& fieldset": {
                  borderColor: alpha(theme.palette.divider, 0.15),
                },
                "&:hover fieldset": {
                  borderColor: alpha(theme.palette.divider, 0.3),
                },
              },
            }}
          />
          <IconButton
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              bgcolor: input.trim()
                ? "primary.main"
                : alpha(theme.palette.divider, 0.08),
              color: input.trim() ? "white" : "text.disabled",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: input.trim()
                  ? "primary.dark"
                  : alpha(theme.palette.divider, 0.12),
              },
              "&:active": { transform: "scale(0.9)" },
            }}
          >
            {sending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <PaperPlaneRight size={20} weight="fill" />
            )}
          </IconButton>
        </Stack>
      </Box>
    </>
  );
};

// ═══════════════════════════════════════════════════
//  MESSAGE BUBBLE
// ═══════════════════════════════════════════════════
const MessageBubble = ({
  msg,
  isMe,
  isGroup,
  color,
  onDelete,
  theme,
  mode,
}) => {
  const [showDelete, setShowDelete] = useState(false);
  const avatarUrl = getAvatarUrl(msg.profile_picture);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      style={{
        alignSelf: isMe ? "flex-end" : "flex-start",
        maxWidth: "80%",
        marginBottom: 4,
        marginTop: isGroup && !isMe ? 2 : 0,
      }}
    >
      <Stack
        direction={isMe ? "row-reverse" : "row"}
        spacing={1}
        alignItems="flex-end"
      >
        {/* Avatar — for other users */}
        {!isMe && (
          <Avatar
            src={avatarUrl}
            sx={{
              width: 30,
              height: 30,
              fontSize: "0.55rem",
              fontWeight: 900,
              flexShrink: 0,
              bgcolor: alpha(color, 0.15),
              color,
              mb: 0.5,
            }}
          >
            {getInitials(msg.name)}
          </Avatar>
        )}

        <Box
          onClick={() => isMe && setShowDelete((p) => !p)}
          onContextMenu={(e) => {
            if (isMe) {
              e.preventDefault();
              setShowDelete((p) => !p);
            }
          }}
          sx={{
            position: "relative",
            px: 2,
            py: 1.2,
            borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            bgcolor: isMe
              ? "primary.main"
              : mode === "light"
                ? alpha(color, 0.08)
                : alpha(color, 0.15),
            color: isMe ? "white" : "text.primary",
            wordBreak: "break-word",
            cursor: isMe ? "pointer" : "default",
          }}
        >
          {/* Sender name in group */}
          {isGroup && !isMe && (
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "0.65rem",
                color: color,
                mb: 0.3,
                letterSpacing: "-0.2px",
              }}
            >
              {msg.name}
            </Typography>
          )}

          {/* Message text */}
          <Typography
            component="div"
            sx={{
              fontSize: "0.88rem",
              fontWeight: 500,
              lineHeight: 1.45,
              "& a": { color: "inherit", textDecoration: "underline" },
            }}
            dangerouslySetInnerHTML={{ __html: linkify(msg.message) }}
          />

          {/* Time */}
          <Typography
            sx={{
              fontSize: "0.55rem",
              fontWeight: 600,
              mt: 0.5,
              textAlign: "right",
              opacity: isMe ? 0.7 : 0.45,
            }}
          >
            {formatTime(msg.created_at)}
          </Typography>

          {/* Delete button */}
          <AnimatePresence>
            {showDelete && isMe && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ position: "absolute", top: -12, right: -4 }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                    setShowDelete(false);
                  }}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: "#d32f2f",
                    color: "white",
                    boxShadow: "0 2px 8px rgba(211,47,47,0.3)",
                    "&:hover": { bgcolor: "#b71c1c" },
                  }}
                >
                  <Trash size={14} weight="bold" />
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Stack>
    </motion.div>
  );
};

export default Chat;
