import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  Stack,
  Switch,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
  useTheme,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  CaretLeft,
  CaretRight,
  User,
  UsersThree,
  Bell,
  Lock,
  Wallet,
  Broom,
  SquaresFour,
  House,
  CalendarBlank,
  Gear,
  CheckCircle,
  ChartPieSlice,
  Student,
  ChatCircleText,
  Sparkle,
  CaretDown,
  CaretUp,
  FloppyDisk,
  Sun,
  Moon,
  List,
  Eye,
  EyeSlash,
  X,
  Repeat,
  SignOut,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import useAuthStore from "../store/auth";
import useSettingsStore from "../store/settingsStore";
import useThemeStore from "../store/themeStore";
import {
  motion,
  Reorder,
  AnimatePresence,
  useDragControls,
} from "framer-motion";
import toast from "../utils/toast";
import { alpha } from "@mui/material/styles";

const ICON_MAP = {
  dock_show_home: { label: "Home", icon: House },
  dock_show_crew: { label: "Crew", icon: UsersThree },
  dock_show_wallet: { label: "Wallet", icon: Wallet },
  dock_show_attendance: { label: "Maid Attendance", icon: CheckCircle },
  dock_show_profile: { label: "Profile", icon: User },
  dock_show_analytics: { label: "Analytics", icon: ChartPieSlice },
  dock_show_schedule: { label: "Class Schedule", icon: Student },
  dock_show_chat: { label: "Chat", icon: ChatCircleText },
  dock_show_settings: { label: "Settings", icon: Gear },
};

const SettingItem = ({
  icon: Icon,
  title,
  subtitle,
  action,
  destructive = false,
  dragHandle = null,
}) => {
  const theme = useTheme();
  const { mode } = useThemeStore();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 2,
        px: 1,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        borderRadius: "20px",
        "&:hover":
          action &&
          typeof action.type !== "string" &&
          action.type?.name !== "Switch"
            ? {
                bgcolor: alpha(
                  destructive
                    ? theme.palette.error.main
                    : theme.palette.primary.main,
                  0.04,
                ),
              }
            : {},
      }}
    >
      <Stack direction="row" spacing={2.5} alignItems="center" sx={{ flex: 1 }}>
        {dragHandle}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "14px",
            bgcolor: destructive
              ? alpha(theme.palette.error.main, 0.1)
              : alpha(theme.palette.primary.main, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.3s ease",
          }}
        >
          <Icon
            size={22}
            weight="duotone"
            color={
              destructive
                ? theme.palette.error.main
                : theme.palette.primary.main
            }
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 800,
              color: destructive ? "error.main" : "text.primary",
              letterSpacing: "-0.3px",
              fontSize: "0.95rem",
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                display: "block",
                mt: 0.1,
                lineHeight: 1.2,
                opacity: 0.8,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      <Box sx={{ ml: 2, flexShrink: 0 }}>{action}</Box>
    </Box>
  );
};

const ReorderableItem = ({
  item,
  index,
  activeItems,
  handleDockToggle,
  mode,
  theme,
}) => {
  const controls = useDragControls();
  const details = ICON_MAP[item.id] || { label: "Unknown", icon: House };
  const showDockHeader = index === 0;
  const showMoreHeader = activeItems.length > 5 && index === 4;

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      layout
      style={{ position: "relative" }}
    >
      {showDockHeader && (
        <Box
          sx={{
            py: 1.2,
            px: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            borderRadius: "12px",
            mb: 1.5,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 900,
              color: "primary.main",
              letterSpacing: "0.8px",
              fontSize: "0.65rem",
            }}
          >
            PINNED TO DOCK
          </Typography>
        </Box>
      )}
      {showMoreHeader && (
        <Box
          sx={{
            py: 1.2,
            px: 1.5,
            bgcolor: alpha(theme.palette.text.secondary, 0.05),
            borderRadius: "12px",
            mt: 2,
            mb: 1,
            border: `1px solid ${alpha(theme.palette.text.secondary, 0.1)}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 900,
              color: "text.secondary",
              letterSpacing: "0.8px",
              fontSize: "0.65rem",
            }}
          >
            INSIDE "MORE" MENU
          </Typography>
        </Box>
      )}
      <SettingItem
        icon={details.icon}
        title={details.label}
        dragHandle={
          <Box
            onPointerDown={(e) => controls.start(e)}
            sx={{
              color: "text.disabled",
              cursor: "grab",
              padding: "8px",
              margin: "-8px",
              touchAction: "none",
              "&:active": { cursor: "grabbing" },
            }}
          >
            <List size={20} weight="bold" />
          </Box>
        }
        action={
          <Switch
            size="small"
            checked={item.visible}
            onChange={() => handleDockToggle(item.id)}
            color="primary"
          />
        }
      />
      {index < activeItems.length - 1 && !showMoreHeader && (
        <Divider sx={{ opacity: 0.3 }} />
      )}
    </Reorder.Item>
  );
};

const Settings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { settings, updateSetting, getSetting, getJsonSetting } =
    useSettingsStore();
  const { mode, toggleTheme } = useThemeStore();

  const [isDockExpanded, setIsDockExpanded] = useState(false);
  const [localDockConfig, setLocalDockConfig] = useState([]); // Array of { id, visible }
  const [isSaving, setIsSaving] = useState(false);

  // Budget Edit State
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [localBudget, setLocalBudget] = useState("");

  // Password Change State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.post("/auth/change-password", {
        current_password: passwordData.current,
        new_password: passwordData.new,
      });
      toast.success(res.message || "Password updated successfully");
      setPasswordModalOpen(false);
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch (err) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Initial load of dock config
  useEffect(() => {
    const defaultIds = Object.keys(ICON_MAP);
    const savedConfig = getJsonSetting("dock_config", null);

    let initialConfig = [];

    if (Array.isArray(savedConfig)) {
      // New ordered array format
      initialConfig = savedConfig.map((item) => ({
        id: item.id,
        visible: item.visible ?? true,
      }));

      // Add any missing default IDs
      const currentIds = initialConfig.map((i) => i.id);
      defaultIds.forEach((id) => {
        if (!currentIds.includes(id)) {
          initialConfig.push({ id, visible: true });
        }
      });
    } else if (savedConfig && typeof savedConfig === "object") {
      // Migration from old object-style config
      initialConfig = defaultIds.map((id) => ({
        id,
        visible:
          savedConfig[id] !== undefined
            ? savedConfig[id]
            : id === "dock_show_settings" || id === "dock_show_home",
      }));
    } else {
      // Default initial state — Home, Profile, Wallet, Chat, Settings
      initialConfig = defaultIds.map((id) => ({
        id,
        visible: [
          "dock_show_home",
          "dock_show_profile",
          "dock_show_wallet",
          "dock_show_chat",
          "dock_show_settings",
        ].includes(id),
      }));
    }

    // Filter out any IDs not present in ICON_MAP (e.g., removed features like Roster)
    initialConfig = initialConfig.filter((item) => ICON_MAP[item.id]);

    setLocalDockConfig(initialConfig);
  }, [settings]);

  const hasMaid = getSetting("has_maid", false);

  // Split config for UI
  const activeItems = useMemo(
    () => localDockConfig.filter((i) => i.visible),
    [localDockConfig],
  );
  const inactiveItems = useMemo(
    () => localDockConfig.filter((i) => !i.visible),
    [localDockConfig],
  );

  const handleDockToggle = (id) => {
    setLocalDockConfig((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item,
      ),
    );
  };

  const handleReorder = (newActiveOrder) => {
    // Construct full order: NewActive + Existing Inactive
    setLocalDockConfig([...newActiveOrder, ...inactiveItems]);
  };

  const saveDockConfig = async () => {
    setIsSaving(true);
    // Clean save: only id and visible
    const cleanSave = localDockConfig.map(({ id, visible }) => ({
      id,
      visible,
    }));
    await updateSetting("dock_config", JSON.stringify(cleanSave));
    setIsSaving(false);
    setIsDockExpanded(false);
  };

  const handleMaidToggle = async (checked) => {
    try {
      // 1. Update has_maid setting
      await updateSetting("has_maid", checked);

      // 2. Update localDockConfig for the current session's UI
      const updatedDockConfig = localDockConfig.map((item) =>
        item.id === "dock_show_attendance"
          ? { ...item, visible: checked }
          : item,
      );
      setLocalDockConfig(updatedDockConfig);

      // 3. Persist the updated dock config to the backend
      const cleanSave = updatedDockConfig.map(({ id, visible }) => ({
        id,
        visible,
      }));
      await updateSetting("dock_config", JSON.stringify(cleanSave));

      toast.success(`Maid service ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update maid service setting");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 12 }}>
      <Box
        sx={{
          px: 3,
          pt: 5,
          pb: 3,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              borderRadius: "12px",
              p: 1.2,
            }}
          >
            <CaretLeft size={20} weight="bold" />
          </IconButton>
        </Stack>
        <Box sx={{ mt: 3, px: 0.5 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              letterSpacing: "-1.5px",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            Settings <span style={{ opacity: 0.8 }}>⚙️</span>
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              mt: 0.5,
              opacity: 0.7,
            }}
          >
            Personalize your RoomOS experience
          </Typography>
        </Box>
      </Box>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Budget moved to Wallet */}

          {/* Auto-Debits Section */}
          <Typography
            variant="overline"
            sx={{
              fontWeight: 900,
              color: "text.secondary",
              letterSpacing: "2px",
              mt: 5,
              mb: 1.5,
              display: "block",
              px: 1,
              opacity: 0.6,
              fontSize: "0.7rem",
            }}
          >
            FINANCE
          </Typography>
          <Card
            sx={{
              p: 1,
              borderRadius: "28px",
              boxShadow:
                mode === "light"
                  ? "0 8px 32px rgba(0,0,0,0.04)"
                  : "0 8px 32px rgba(0,0,0,0.2)",
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: "background.paper",
            }}
          >
            <Box onClick={() => navigate("/settings/auto-debits")}>
              <SettingItem
                icon={Repeat}
                title="Auto-Debits"
                subtitle="Manage recurring payments & bills"
                action={
                  <CaretRight
                    weight="bold"
                    size={16}
                    style={{ opacity: 0.3 }}
                  />
                }
              />
            </Box>
          </Card>

          {/* Account Section */}
          <Typography
            variant="overline"
            sx={{
              fontWeight: 900,
              color: "text.secondary",
              letterSpacing: "2px",
              mt: 5,
              mb: 1.5,
              display: "block",
              px: 1,
              opacity: 0.6,
              fontSize: "0.7rem",
            }}
          >
            ACCOUNT
          </Typography>
          <Card
            sx={{
              p: 1,
              borderRadius: "28px",
              boxShadow:
                mode === "light"
                  ? "0 8px 32px rgba(0,0,0,0.04)"
                  : "0 8px 32px rgba(0,0,0,0.2)",
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: "background.paper",
            }}
          >
            <Box onClick={() => navigate("/settings/personal-details")}>
              <SettingItem
                icon={User}
                title="Personal Details"
                subtitle="Name, Email & Profile Picture"
                action={
                  <CaretRight
                    weight="bold"
                    size={16}
                    style={{ opacity: 0.3 }}
                  />
                }
              />
            </Box>
            <Divider sx={{ mx: 2, opacity: 0.4 }} />
            <Box onClick={() => navigate("/crew")}>
              <SettingItem
                icon={UsersThree}
                title="Group Members"
                subtitle="Manage roomies and access"
                action={
                  <CaretRight
                    weight="bold"
                    size={16}
                    style={{ opacity: 0.3 }}
                  />
                }
              />
            </Box>
            <Divider sx={{ mx: 2, opacity: 0.4 }} />
            <Box onClick={() => navigate("/notifications")}>
              <SettingItem
                icon={Bell}
                title="Notifications"
                subtitle="Activity and house alerts"
                action={
                  <CaretRight
                    weight="bold"
                    size={16}
                    style={{ opacity: 0.3 }}
                  />
                }
              />
            </Box>
          </Card>

          {/* Security Section */}
          <Typography
            variant="overline"
            sx={{
              fontWeight: 900,
              color: "text.secondary",
              letterSpacing: "2px",
              mt: 5,
              mb: 1.5,
              display: "block",
              px: 1,
              opacity: 0.6,
              fontSize: "0.7rem",
            }}
          >
            SECURITY
          </Typography>
          <Card
            sx={{
              p: 1,
              borderRadius: "28px",
              boxShadow:
                mode === "light"
                  ? "0 8px 32px rgba(0,0,0,0.04)"
                  : "0 8px 32px rgba(0,0,0,0.2)",
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: "background.paper",
            }}
          >
            <Box onClick={() => setPasswordModalOpen(true)}>
              <SettingItem
                icon={Lock}
                title="Change Password"
                subtitle="Update your security credentials"
                action={
                  <CaretRight
                    weight="bold"
                    size={16}
                    style={{ opacity: 0.3 }}
                  />
                }
              />
            </Box>
          </Card>

          {/* Maid Service Toggle relocated here */}
          <Card
            sx={{
              p: 1,
              mt: 5,
              borderRadius: "32px",
              boxShadow:
                mode === "light"
                  ? "0 12px 40px rgba(0,0,0,0.05)"
                  : "0 12px 40px rgba(0,0,0,0.25)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              bgcolor: "background.paper",
              overflow: "hidden",
            }}
          >
            <SettingItem
              icon={Broom}
              title="Maid Service"
              subtitle={
                hasMaid
                  ? "Currently tracking attendance"
                  : "Tracking is disabled"
              }
              action={
                <Switch
                  size="small"
                  checked={hasMaid}
                  onChange={(e) => handleMaidToggle(e.target.checked)}
                  color="primary"
                />
              }
            />
            <Box
              sx={{
                m: 1,
                p: 2,
                borderRadius: "24px",
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 900,
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  mb: 0.8,
                  letterSpacing: "0.5px",
                }}
              >
                <Sparkle size={16} weight="duotone" /> DOCK INTEGRATION
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  lineHeight: 1.5,
                  display: "block",
                  opacity: 0.8,
                }}
              >
                Toggling this will automatically update your bottom dock to show
                or hide the maid attendance shortcut.
              </Typography>
            </Box>
          </Card>

          {/* Dock Visibility Section */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 4,
              mb: 2,
              px: 1,
            }}
          >
            <Typography
              variant="overline"
              sx={{
                fontWeight: 900,
                color: "text.secondary",
                letterSpacing: "2px",
                opacity: 0.6,
                fontSize: "0.7rem",
              }}
            >
              DOCK CONFIGURATION
            </Typography>
            <IconButton
              size="small"
              onClick={() => setIsDockExpanded(!isDockExpanded)}
              sx={{ color: "text.secondary" }}
            >
              {isDockExpanded ? (
                <CaretUp weight="bold" />
              ) : (
                <CaretDown weight="bold" />
              )}
            </IconButton>
          </Box>

          <Card
            sx={{
              p: 2,
              borderRadius: "24px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <SettingItem
              icon={SquaresFour}
              title="Position & Visibility"
              subtitle={`${activeItems.length} items active`}
              action={
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setIsDockExpanded(!isDockExpanded)}
                  sx={{ fontWeight: 700 }}
                >
                  {isDockExpanded ? "Close" : "Reorder"}
                </Button>
              }
            />

            <Collapse in={isDockExpanded}>
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    mb: 1.5,
                    color: "primary.main",
                    display: "block",
                    textAlign: "right",
                  }}
                >
                  DRAG TO REORDER ACTIVE
                </Typography>

                <Reorder.Group
                  axis="y"
                  values={activeItems}
                  onReorder={handleReorder}
                  style={{ listStyle: "none", padding: 0, margin: 0 }}
                >
                  {activeItems.map((item, index) => (
                    <ReorderableItem
                      key={item.id}
                      item={item}
                      index={index}
                      activeItems={activeItems}
                      handleDockToggle={handleDockToggle}
                      mode={mode}
                      theme={theme}
                    />
                  ))}
                </Reorder.Group>

                {inactiveItems.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        mb: 1,
                        color: "text.secondary",
                        display: "block",
                      }}
                    >
                      INACTIVE ITEMS
                    </Typography>
                    {inactiveItems.map((item, index) => {
                      const details = ICON_MAP[item.id] || {
                        label: "Unknown",
                        icon: House,
                      };
                      return (
                        <Box key={item.id}>
                          <SettingItem
                            icon={details.icon}
                            title={details.label}
                            action={
                              <Switch
                                size="small"
                                checked={item.visible}
                                onChange={() => handleDockToggle(item.id)}
                                color="primary"
                              />
                            }
                          />
                          {index < inactiveItems.length - 1 && (
                            <Divider sx={{ opacity: 0.3 }} />
                          )}
                        </Box>
                      );
                    })}
                  </>
                )}

                <Box sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<FloppyDisk weight="bold" />}
                    onClick={saveDockConfig}
                    disabled={isSaving}
                    sx={{
                      borderRadius: "16px",
                      py: 1.5,
                      fontWeight: 800,
                      boxShadow: "none",
                      "&:hover": { boxShadow: "0 8px 20px rgba(0,0,0,0.1)" },
                    }}
                  >
                    {isSaving ? "Saving..." : "Save Configuration"}
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </Card>

          {/* Appearance Section */}
          <Typography
            variant="overline"
            sx={{
              fontWeight: 900,
              color: "text.secondary",
              letterSpacing: "2px",
              mt: 5,
              mb: 1.5,
              display: "block",
              px: 1,
              opacity: 0.6,
              fontSize: "0.7rem",
            }}
          >
            APPEARANCE
          </Typography>
          <Card
            sx={{
              p: 1,
              borderRadius: "28px",
              boxShadow:
                mode === "light"
                  ? "0 8px 32px rgba(0,0,0,0.04)"
                  : "0 8px 32px rgba(0,0,0,0.2)",
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: "background.paper",
            }}
          >
            <SettingItem
              icon={mode === "dark" ? Moon : Sun}
              title="Dark Mode"
              subtitle={
                mode === "dark" ? "Using dark theme" : "Using light theme"
              }
              action={
                <Switch
                  size="small"
                  checked={mode === "dark"}
                  onChange={toggleTheme}
                  color="primary"
                />
              }
            />
          </Card>

          {/* Logout */}
          <Box sx={{ mt: 6, mb: 4 }}>
            <Button
              fullWidth
              onClick={() => {
                logout();
                navigate("/login");
              }}
              startIcon={<SignOut size={22} weight="duotone" />}
              sx={{
                py: 2.2,
                borderRadius: "24px",
                fontWeight: 900,
                fontSize: "1rem",
                textTransform: "none",
                color: "error.main",
                bgcolor: alpha(theme.palette.error.main, 0.08),
                border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
                boxShadow: "none",
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "scale(0.98)" },
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              Sign Out from RoomOS
            </Button>
          </Box>

          {/* Change Password Dialog */}
          <Dialog
            open={passwordModalOpen}
            onClose={() => setPasswordModalOpen(false)}
            PaperProps={{
              sx: {
                borderRadius: "32px",
                p: 1,
                width: "95%",
                maxWidth: "420px",
                backgroundImage: "none",
                bgcolor:
                  mode === "light"
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(23, 23, 23, 0.9)",
                backdropFilter: "blur(20px)",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              },
            }}
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pb: 1,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "12px",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock
                    weight="duotone"
                    size={24}
                    color={theme.palette.primary.main}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}
                >
                  Security Update
                </Typography>
              </Stack>
              <IconButton
                onClick={() => setPasswordModalOpen(false)}
                sx={{ color: "text.disabled" }}
              >
                <X weight="bold" size={20} />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  mb: 4,
                  px: 0.5,
                }}
              >
                Choose a strong password to keep your RoomOS account safe.
              </Typography>

              <Stack spacing={2.5}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      ml: 1,
                      mb: 0.5,
                      display: "block",
                    }}
                  >
                    CURRENT PASSWORD
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPasswords ? "text" : "password"}
                    variant="filled"
                    placeholder="••••••••"
                    value={passwordData.current}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        current: e.target.value,
                      })
                    }
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        borderRadius: "16px",
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.action.active, 0.04),
                        "&:hover": {
                          bgcolor: alpha(theme.palette.action.active, 0.06),
                        },
                        "&.Mui-focused": {
                          bgcolor: alpha(theme.palette.action.active, 0.06),
                        },
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPasswords(!showPasswords)}
                            size="small"
                          >
                            {showPasswords ? (
                              <EyeSlash weight="fill" />
                            ) : (
                              <Eye weight="fill" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      ml: 1,
                      mb: 0.5,
                      display: "block",
                    }}
                  >
                    NEW PASSWORD
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPasswords ? "text" : "password"}
                    variant="filled"
                    placeholder="At least 8 characters"
                    value={passwordData.new}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new: e.target.value })
                    }
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        borderRadius: "16px",
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.action.active, 0.04),
                        "&:hover": {
                          bgcolor: alpha(theme.palette.action.active, 0.06),
                        },
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary",
                      ml: 1,
                      mb: 0.5,
                      display: "block",
                    }}
                  >
                    CONFIRM NEW PASSWORD
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPasswords ? "text" : "password"}
                    variant="filled"
                    placeholder="Repeat new password"
                    value={passwordData.confirm}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirm: e.target.value,
                      })
                    }
                    error={
                      passwordData.confirm &&
                      passwordData.new !== passwordData.confirm
                    }
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        borderRadius: "16px",
                        fontWeight: 600,
                        bgcolor: alpha(theme.palette.action.active, 0.04),
                        "&:hover": {
                          bgcolor: alpha(theme.palette.action.active, 0.06),
                        },
                      },
                    }}
                  />
                </Box>
              </Stack>
            </DialogContent>

            <DialogActions
              sx={{ p: 3, pt: 1, flexDirection: "column", gap: 1.5 }}
            >
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handlePasswordChange}
                disabled={
                  passwordLoading ||
                  !passwordData.current ||
                  !passwordData.new ||
                  !passwordData.confirm
                }
                sx={{
                  borderRadius: "18px",
                  py: 1.8,
                  fontWeight: 900,
                  fontSize: "0.95rem",
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`,
                  textTransform: "none",
                  "&:hover": {
                    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.35)}`,
                    transform: "translateY(-1px)",
                  },
                  "&.Mui-disabled": {
                    bgcolor: alpha(
                      theme.palette.action.disabledBackground,
                      0.1,
                    ),
                    color: theme.palette.action.disabled,
                  },
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {passwordLoading ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : (
                  "Update Security Credentials"
                )}
              </Button>
              <Button
                fullWidth
                onClick={() => setPasswordModalOpen(false)}
                sx={{
                  fontWeight: 800,
                  color: "text.secondary",
                  textTransform: "none",
                  py: 1.5,
                  borderRadius: "16px",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.action.active, 0.04),
                  },
                }}
              >
                Back to Settings
              </Button>
            </DialogActions>
          </Dialog>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Settings;
