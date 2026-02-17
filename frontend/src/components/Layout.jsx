import React, { useState, useMemo } from "react";
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import {
  House,
  CalendarBlank,
  UsersThree,
  Wallet,
  Gear,
  CheckCircle,
  User,
  ChartPieSlice,
  Student,
  ChatCircleText,
  SquaresFour,
} from "@phosphor-icons/react";
import { useNavigate, useLocation } from "react-router-dom";
import useSettingsStore from "../store/settingsStore";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, getJsonSetting } = useSettingsStore();

  // State for the overflow menu
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // Define all available tabs
  const allTabs = useMemo(
    () => [
      {
        id: "home",
        path: "/dashboard",
        icon: House,
        configKey: "dock_show_home",
        label: "Home",
      },
      {
        id: "crew",
        path: "/crew",
        icon: UsersThree,
        configKey: "dock_show_crew",
        label: "Crew",
      },
      {
        id: "wallet",
        path: "/transactions",
        icon: Wallet,
        configKey: "dock_show_wallet",
        label: "Wallet",
      },
      {
        id: "attendance",
        path: "/settings/maid-attendance",
        icon: CheckCircle,
        configKey: "dock_show_attendance",
        label: "Attendance",
      },
      {
        id: "profile",
        path: "/profile",
        icon: User,
        configKey: "dock_show_profile",
        label: "Profile",
      },
      {
        id: "analytics",
        path: "/analytics",
        icon: ChartPieSlice,
        configKey: "dock_show_analytics",
        label: "Analytics",
      },
      {
        id: "schedule",
        path: "/schedule",
        icon: Student,
        configKey: "dock_show_schedule",
        label: "Schedule",
      },
      {
        id: "chat",
        path: "/chat",
        icon: ChatCircleText,
        configKey: "dock_show_chat",
        label: "Chat",
      },
      {
        id: "settings",
        path: "/settings",
        icon: Gear,
        configKey: "dock_show_settings",
        label: "Settings",
      },
    ],
    [],
  );

  // Map visible tabs based on the ordered JSON config
  const visibleTabs = useMemo(() => {
    const config = getJsonSetting("dock_config", []);

    if (Array.isArray(config)) {
      // New ordered array format
      return config
        .filter((item) => item.visible)
        .map((item) => allTabs.find((tab) => tab.configKey === item.id))
        .filter(Boolean); // Remote any tabs not found in allTabs
    } else if (config && typeof config === "object") {
      // Fallback for old object format
      return allTabs.filter((tab) => config[tab.configKey]);
    }

    // Default set if config is empty — Home, Profile, Wallet, Chat, Settings
    return allTabs.filter((tab) =>
      [
        "dock_show_home",
        "dock_show_profile",
        "dock_show_wallet",
        "dock_show_chat",
        "dock_show_settings",
      ].includes(tab.configKey),
    );
  }, [allTabs, getJsonSetting, settings]);

  // Split tabs into dock items and overflow
  const hasOverflow = visibleTabs.length > 5;
  const dockTabs = useMemo(
    () => (hasOverflow ? visibleTabs.slice(0, 4) : visibleTabs),
    [visibleTabs, hasOverflow],
  );
  const overflowTabs = useMemo(
    () => (hasOverflow ? visibleTabs.slice(4) : []),
    [visibleTabs, hasOverflow],
  );

  // Find the current active index for BottomNavigation
  const activeTabIndex = useMemo(() => {
    // Check if path is in dock items
    const dockIndex = dockTabs.findIndex((tab) =>
      location.pathname.includes(tab.path),
    );
    if (dockIndex !== -1) return dockIndex;

    // If path is in overflow items, highlight the "More" button (index 4)
    const isOverflowActive = overflowTabs.some((tab) =>
      location.pathname.includes(tab.path),
    );
    if (isOverflowActive && hasOverflow) return 4;

    return null;
  }, [dockTabs, overflowTabs, location.pathname, hasOverflow]);

  const handleMoreClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleCloseMenu();
  };

  // Hide dock on chat page
  const hideDock = location.pathname === "/chat";

  return (
    <Box sx={{ pb: hideDock ? 0 : 7 }}>
      {children}

      {!hideDock && (
        <>
          <Paper
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: "28px 28px 0 0",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.06)",
              overflow: "hidden",
              zIndex: 1000,
              bgcolor: "background.paper",
              borderTop: "1px solid rgba(0,0,0,0.05)",
            }}
            elevation={0}
          >
            <BottomNavigation
              showLabels={false}
              value={activeTabIndex}
              onChange={(event, newValue) => {
                if (hasOverflow && newValue === 4) {
                  handleMoreClick(event);
                } else if (dockTabs[newValue]) {
                  navigate(dockTabs[newValue].path);
                }
              }}
              sx={{
                height: 62,
                "& .MuiBottomNavigationAction-root": {
                  color: "text.secondary",
                  minWidth: 0,
                  transition: "all 0.2s",
                  "&:hover": { color: "primary.main" },
                },
                "& .Mui-selected": {
                  color: "primary.main",
                  "& .MuiBottomNavigationAction-label": {
                    fontWeight: 800,
                  },
                },
              }}
            >
              {dockTabs.map((tab, idx) => (
                <BottomNavigationAction
                  key={tab.id}
                  icon={
                    <tab.icon
                      size={24}
                      weight={activeTabIndex === idx ? "fill" : "regular"}
                    />
                  }
                />
              ))}

              {hasOverflow && (
                <BottomNavigationAction
                  key="more"
                  icon={
                    <SquaresFour
                      size={24}
                      weight={activeTabIndex === 4 ? "fill" : "regular"}
                    />
                  }
                />
              )}
            </BottomNavigation>
          </Paper>

          {/* Overflow Menu */}
          <Menu
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleCloseMenu}
            onClick={handleCloseMenu}
            PaperProps={{
              elevation: 5,
              sx: {
                borderRadius: "20px",
                mb: 2,
                minWidth: 160,
                overflow: "visible",
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  bottom: -10,
                  right: 28,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "bottom" }}
            anchorOrigin={{ horizontal: "right", vertical: "top" }}
          >
            {overflowTabs.map((tab) => (
              <MenuItem
                key={tab.id}
                onClick={() => handleNavigate(tab.path)}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderRadius: "12px",
                  mx: 1,
                  my: 0.5,
                  color: location.pathname.includes(tab.path)
                    ? "primary.main"
                    : "text.primary",
                  bgcolor: location.pathname.includes(tab.path)
                    ? "rgba(99, 102, 241, 0.08)"
                    : "transparent",
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname.includes(tab.path)
                      ? "inherit"
                      : "text.secondary",
                    minWidth: "40px !important",
                  }}
                >
                  <tab.icon
                    size={22}
                    weight={
                      location.pathname.includes(tab.path) ? "fill" : "regular"
                    }
                  />
                </ListItemIcon>
                <ListItemText
                  primary={tab.label}
                  primaryTypographyProps={{
                    fontWeight: location.pathname.includes(tab.path)
                      ? 800
                      : 600,
                    fontSize: "0.9rem",
                  }}
                />
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Box>
  );
};

export default Layout;
