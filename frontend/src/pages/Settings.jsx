import React, { useState, useEffect, useMemo } from 'react';
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
    Button
} from '@mui/material';
import { 
    CaretLeft, 
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
    CaretDown,
    CaretUp,
    FloppyDisk,
    Sun,
    Moon,
    List
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import useSettingsStore from '../store/settingsStore';
import useThemeStore from '../store/themeStore';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

// Static mapper to avoid serializing React components
const ICON_MAP = {
    dock_show_home: { label: 'Home', icon: House },
    dock_show_roster: { label: 'Roster', icon: CalendarBlank },
    dock_show_crew: { label: 'Crew', icon: UsersThree },
    dock_show_wallet: { label: 'Wallet', icon: Wallet },
    dock_show_attendance: { label: 'Maid Attendance', icon: CheckCircle },
    dock_show_profile: { label: 'Profile', icon: User },
    dock_show_analytics: { label: 'Analytics', icon: ChartPieSlice },
    dock_show_schedule: { label: 'Class Schedule', icon: Student },
    dock_show_chat: { label: 'Chat', icon: ChatCircleText },
    dock_show_settings: { label: 'Settings', icon: Gear },
};

const Settings = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { settings, updateSetting, getSetting, getJsonSetting } = useSettingsStore();
    const { mode, toggleTheme } = useThemeStore();

    const [isDockExpanded, setIsDockExpanded] = useState(false);
    const [localDockConfig, setLocalDockConfig] = useState([]); // Array of { id, visible }
    const [isSaving, setIsSaving] = useState(false);

    // Initial load of dock config
    useEffect(() => {
        const defaultIds = Object.keys(ICON_MAP);
        const savedConfig = getJsonSetting('dock_config', null);
        
        let initialConfig = [];

        if (Array.isArray(savedConfig)) {
            // New ordered array format
            initialConfig = savedConfig.map(item => ({
                id: item.id,
                visible: item.visible ?? true
            }));
            
            // Add any missing default IDs
            const currentIds = initialConfig.map(i => i.id);
            defaultIds.forEach(id => {
                if (!currentIds.includes(id)) {
                    initialConfig.push({ id, visible: true });
                }
            });
        } else if (savedConfig && typeof savedConfig === 'object') {
            // Migration from old object-style config
            initialConfig = defaultIds.map(id => ({
                id,
                visible: savedConfig[id] !== undefined ? savedConfig[id] : (id === 'dock_show_settings' || id === 'dock_show_home')
            }));
        } else {
            // Default initial state
            initialConfig = defaultIds.map(id => ({ 
                id, 
                visible: ['dock_show_home', 'dock_show_roster', 'dock_show_crew', 'dock_show_wallet', 'dock_show_settings'].includes(id) 
            }));
        }

        setLocalDockConfig(initialConfig);
    }, [settings]);

    const hasMaid = getSetting('has_maid', false);
    const monthlyBudget = getSetting('monthly_budget', '0');

    // Split config for UI
    const activeItems = useMemo(() => localDockConfig.filter(i => i.visible), [localDockConfig]);
    const inactiveItems = useMemo(() => localDockConfig.filter(i => !i.visible), [localDockConfig]);

    const handleDockToggle = (id) => {
        setLocalDockConfig(prev => prev.map(item => 
            item.id === id ? { ...item, visible: !item.visible } : item
        ));
    };

    const handleReorder = (newActiveOrder) => {
        // Construct full order: NewActive + Existing Inactive
        setLocalDockConfig([...newActiveOrder, ...inactiveItems]);
    };

    const saveDockConfig = async () => {
        setIsSaving(true);
        // Clean save: only id and visible
        const cleanSave = localDockConfig.map(({ id, visible }) => ({ id, visible }));
        await updateSetting('dock_config', JSON.stringify(cleanSave));
        setIsSaving(false);
        setIsDockExpanded(false);
    };

    const SettingItem = ({ icon: Icon, title, subtitle, action, destructive = false, dragHandle = null }) => (
        <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            py: 1.5,
            px: 1
        }}>
            <Stack direction="row" spacing={2} alignItems="center">
                {dragHandle}
                <Box sx={{ 
                    width: 38, height: 38, 
                    borderRadius: '10px', 
                    bgcolor: destructive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}>
                    <Icon size={20} weight="bold" color={destructive ? '#EF4444' : '#6366F1'} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: destructive ? 'error.main' : 'text.primary' }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: -0.5 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
            </Stack>
            {action}
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 12 }}>
            <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <CaretLeft size={20} weight="bold" />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-1.5px' }}>Settings</Typography>
            </Box>

            <Container maxWidth="sm">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    
                    {/* Household Preferences Section */}
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', tracking: '1px', mt: 4, mb: 2, display: 'block', px: 1 }}>
                        HOUSEHOLD & SETUP
                    </Typography>
                    <Card sx={{ p: 2, borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: `1px solid ${theme.palette.divider}` }}>
                        <SettingItem 
                            icon={Broom}
                            title="Maid Service"
                            subtitle="Switch dashboard mode"
                            action={
                                <Switch 
                                    size="small"
                                    checked={hasMaid}
                                    onChange={(e) => updateSetting('has_maid', e.target.checked)}
                                    color="primary"
                                />
                            }
                        />
                        <Divider sx={{ my: 1, opacity: 0.5 }} />
                        <Box sx={{ p: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, color: 'text.secondary', display: 'block' }}>MONTHLY GOAL</Typography>
                            <TextField 
                                fullWidth
                                variant="outlined"
                                size="small"
                                type="number"
                                value={monthlyBudget}
                                onChange={(e) => updateSetting('monthly_budget', e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><Typography sx={{ fontWeight: 800, fontSize: '0.8rem' }}>₹</Typography></InputAdornment>,
                                    sx: { borderRadius: '12px', fontWeight: 700, bgcolor: 'rgba(0,0,0,0.02)' }
                                }}
                            />
                        </Box>
                    </Card>

                    {/* Account Section */}
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', tracking: '1px', mt: 4, mb: 2, display: 'block', px: 1 }}>
                        ACCOUNT
                    </Typography>
                    <Card sx={{ p: 2, borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: `1px solid ${theme.palette.divider}` }}>
                        <SettingItem 
                            icon={User}
                            title="Personal Details"
                            subtitle="Name, Email & Profile Picture"
                        />
                        <Divider sx={{ my: 1, opacity: 0.5 }} />
                        <SettingItem 
                            icon={UsersThree}
                            title="Group Members"
                            subtitle="Manage roomies and access"
                        />
                        <Divider sx={{ my: 1, opacity: 0.5 }} />
                        <SettingItem 
                            icon={Bell}
                            title="Notifications"
                            subtitle="Payment alerts and duty reminders"
                        />
                    </Card>

                    {/* Security Section */}
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', tracking: '1px', mt: 4, mb: 2, display: 'block', px: 1 }}>
                        SECURITY
                    </Typography>
                    <Card sx={{ p: 2, borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: `1px solid ${theme.palette.divider}` }}>
                        <SettingItem 
                            icon={Lock}
                            title="Change Password"
                        />
                    </Card>

                    {/* Dock Visibility Section */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, mb: 2, px: 1 }}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', tracking: '1px' }}>
                            DOCK CONFIGURATION
                        </Typography>
                        <IconButton 
                            size="small" 
                            onClick={() => setIsDockExpanded(!isDockExpanded)}
                            sx={{ color: 'text.secondary' }}
                        >
                            {isDockExpanded ? <CaretUp weight="bold" /> : <CaretDown weight="bold" />}
                        </IconButton>
                    </Box>
                    
                    <Card sx={{ p: 2, borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: `1px solid ${theme.palette.divider}` }}>
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
                                    {isDockExpanded ? 'Close' : 'Reorder'}
                                </Button>
                            }
                        />
                        
                        <Collapse in={isDockExpanded}>
                            <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', display: 'block', textAlign: 'right' }}>
                                    DRAG TO REORDER ACTIVE
                                </Typography>
                                
                                <Reorder.Group 
                                    axis="y" 
                                    values={activeItems} 
                                    onReorder={handleReorder}
                                    style={{ listStyle: 'none', padding: 0, margin: 0 }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {activeItems.map((item, index) => {
                                            const details = ICON_MAP[item.id] || { label: 'Unknown', icon: House };
                                            const isOverflow = activeItems.length > 5 && index >= 4;
                                            const showDockHeader = index === 0;
                                            const showMoreHeader = activeItems.length > 5 && index === 4;

                                            return (
                                                <Reorder.Item 
                                                    key={item.id} 
                                                    value={item}
                                                    style={{ position: 'relative' }}
                                                >
                                                    {showDockHeader && (
                                                        <Box sx={{ py: 1, px: 1, bgcolor: 'rgba(99, 102, 241, 0.04)', borderRadius: '8px', mb: 1 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: '0.5px' }}>
                                                                PINNED TO DOCK
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {showMoreHeader && (
                                                        <Box sx={{ py: 1, px: 1, bgcolor: 'rgba(0, 0, 0, 0.04)', borderRadius: '8px', mt: 2, mb: 1 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: '0.5px' }}>
                                                                INSIDE "MORE" MENU
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    <SettingItem 
                                                        icon={details.icon}
                                                        title={details.label}
                                                        dragHandle={
                                                            <Box sx={{ color: 'text.disabled', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>
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
                                                    {index < activeItems.length - 1 && !showMoreHeader && <Divider sx={{ opacity: 0.3 }} />}
                                                </Reorder.Item>
                                            );
                                        })}
                                    </AnimatePresence>
                                </Reorder.Group>

                                {inactiveItems.length > 0 && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, color: 'text.secondary', display: 'block' }}>
                                            INACTIVE ITEMS
                                        </Typography>
                                        {inactiveItems.map((item, index) => {
                                            const details = ICON_MAP[item.id] || { label: 'Unknown', icon: House };
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
                                                    {index < inactiveItems.length - 1 && <Divider sx={{ opacity: 0.3 }} />}
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
                                            borderRadius: '16px', 
                                            py: 1.5, 
                                            fontWeight: 800,
                                            boxShadow: 'none',
                                            '&:hover': { boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }
                                        }}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Configuration'}
                                    </Button>
                                </Box>
                            </Box>
                        </Collapse>
                    </Card>

                    {/* Appearance Section */}
                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', tracking: '1px', mt: 4, mb: 1, display: 'block', px: 1 }}>
                        APPEARANCE
                    </Typography>
                    <Card sx={{ p: 2, borderRadius: '24px', border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                        <SettingItem 
                            icon={mode === 'dark' ? Moon : Sun}
                            title="Dark Mode"
                            action={
                                <Switch 
                                    size="small"
                                    checked={mode === 'dark'}
                                    onChange={toggleTheme}
                                    color="primary"
                                />
                            }
                        />
                    </Card>

                </motion.div>
            </Container>
        </Box>
    );
};

export default Settings;
