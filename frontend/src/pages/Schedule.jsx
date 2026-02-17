
import React, { useState } from 'react';
import { 
    Box, 
    Container, 
    Typography, 
    Card, 
    Stack, 
    IconButton, 
    Button, 
    TextField, 
    Grid, 
    useTheme, 
    alpha,
    Tab,
    Tabs,
    Divider,
    Switch,
    FormControlLabel,
    Paper,
    Avatar
} from '@mui/material';
import { 
    CaretLeft, 
    Plus, 
    Trash, 
    Clock, 
    BookOpen, 
    MapPin, 
    Check, 
    PencilSimple, 
    Coffee,
    Student,
    Monitor,
    GraduationCap,
    Flask,
    Sparkle,
    MagicWand,
    CopySimple,
    X
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '../api';
import { 
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip
} from '@mui/material';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Schedule = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [selectedDay, setSelectedDay] = useState(0);
    const [loading, setLoading] = useState(true);
    
    const [schedule, setSchedule] = useState({
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    });
    
    // Track which days are "Off Days"
    const [offDays, setOffDays] = useState({
        0: false, 1: false, 2: false, 3: false, 4: false, 5: true, 6: true
    });

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [isEditing, setIsEditing] = useState({});

    const fetchSchedule = React.useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/schedule/get-all');
            if (res.schedule) {
                const newSchedule = {};
                const newOffDays = {};
                const newEditing = {};
                
                res.schedule.forEach(day => {
                    newSchedule[day.day_index] = day.classes || [];
                    newOffDays[day.day_index] = !!day.is_off;
                    if ((!day.classes || day.classes.length === 0) && !day.is_off) {
                        newEditing[day.day_index] = true;
                    }
                });
                
                setSchedule(newSchedule);
                setOffDays(newOffDays);
                setIsEditing(newEditing);
            }
        } catch (err) {
            toast.error('Failed to load schedule');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch schedule on mount
    React.useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const handleCancelEdit = (dayIndex) => {
        // Simple way: re-fetch data for this day from server to discard local changes
        fetchSchedule(true);
        setIsEditing(prev => ({ ...prev, [dayIndex]: false }));
        toast.info("Changes discarded");
    };

    const handleImportJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            
            if (Array.isArray(parsed)) {
                // Single day import
                const normalized = parsed.map(entry => ({
                    id: entry.id || Date.now() + Math.random(),
                    startTime: entry.startTime || '09:00',
                    endTime: entry.endTime || '10:00',
                    subject: entry.subject || '',
                    room: entry.room || ''
                }));

                setSchedule(prev => ({
                    ...prev,
                    [selectedDay]: normalized
                }));
                
                setOffDays(prev => ({ ...prev, [selectedDay]: false }));
                setIsEditing(prev => ({ ...prev, [selectedDay]: true }));
                toast.success(`${DAYS[selectedDay]} schedule imported!`);
            } else if (typeof parsed === 'object') {
                // Multi-day import
                const newSchedule = { ...schedule };
                const newEditing = { ...isEditing };
                const newOffDays = { ...offDays };
                let importedCount = 0;

                Object.keys(parsed).forEach(key => {
                    const dayIdx = parseInt(key);
                    if (!isNaN(dayIdx) && dayIdx >= 0 && dayIdx <= 6) {
                        newSchedule[dayIdx] = parsed[key].map(entry => ({
                            id: entry.id || Date.now() + Math.random(),
                            startTime: entry.startTime || '09:00',
                            endTime: entry.endTime || '10:00',
                            subject: entry.subject || '',
                            room: entry.room || ''
                        }));
                        newOffDays[dayIdx] = false;
                        newEditing[dayIdx] = true;
                        importedCount++;
                    }
                });

                if (importedCount === 0) throw new Error('No valid day keys (0-6) found');

                setSchedule(newSchedule);
                setOffDays(newOffDays);
                setIsEditing(newEditing);
                toast.success('Multi-day schedule imported! Please review and finalize each day.');
            } else {
                throw new Error('Invalid format');
            }
            
            setImportModalOpen(false);
            setJsonInput('');
        } catch (err) {
            toast.error(err.message || 'Invalid JSON format. Please check the structure.');
        }
    };

    const handleAddEntry = (dayIndex) => {
        const newEntry = {
            id: Date.now(),
            startTime: '09:00',
            endTime: '10:00',
            subject: '',
            room: ''
        };
        setSchedule(prev => ({
            ...prev,
            [dayIndex]: [...(prev[dayIndex] || []), newEntry]
        }));
    };

    const handleRemoveEntry = (dayIndex, entryId) => {
        setSchedule(prev => ({
            ...prev,
            [dayIndex]: prev[dayIndex].filter(e => e.id !== entryId)
        }));
    };

    const handleUpdateEntry = (dayIndex, entryId, field, value) => {
        setSchedule(prev => ({
            ...prev,
            [dayIndex]: prev[dayIndex].map(e => 
                e.id === entryId ? { ...e, [field]: value } : e
            )
        }));
    };

    const handleSaveDay = async (dayIndex) => {
        if (!offDays[dayIndex] && schedule[dayIndex].length === 0) {
            toast.error("Please add at least one class or mark as an off day.");
            return;
        }

        const loadingToast = toast.loading(`Saving ${DAYS[dayIndex]}...`);
        try {
            await api.post('/schedule/save-day', {
                day_index: dayIndex,
                is_off: offDays[dayIndex],
                classes: schedule[dayIndex]
            });
            
            setIsEditing(prev => ({ ...prev, [dayIndex]: false }));
            toast.success(`${DAYS[dayIndex]} schedule saved!`, { id: loadingToast });
        } catch (err) {
            toast.error(err.message || 'Failed to save', { id: loadingToast });
        }
    };

    const handleToggleOffDay = (dayIndex) => {
        const newVal = !offDays[dayIndex];
        setOffDays(prev => ({ ...prev, [dayIndex]: newVal }));
        setIsEditing(prev => ({ ...prev, [dayIndex]: true }));
    };

    const currentEntries = schedule[selectedDay] || [];
    const isCurrentOffDay = offDays[selectedDay];
    const isCurrentEditing = isEditing[selectedDay] || (currentEntries.length === 0 && !isCurrentOffDay);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: 'background.default' }}>
                <CircularProgress size={40} thickness={4} />
            </Box>
        );
    }

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: 'background.default', 
            pb: 12,
            background: theme.palette.mode === 'light' 
                ? `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${theme.palette.background.default} 100%)`
                : `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.default} 100%)`
        }}>
            {/* Header */}
            <Box sx={{ 
                px: 3, pt: 4, pb: 2, 
                display: 'flex', alignItems: 'center', 
                position: 'sticky', top: 0, 
                bgcolor: alpha(theme.palette.background.default, 0.8),
                backdropFilter: 'blur(15px)',
                zIndex: 10,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}>
                <IconButton 
                    onClick={() => navigate(-1)} 
                    sx={{ 
                        bgcolor: 'background.paper', 
                        mr: 2, 
                        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        '&:hover': { bgcolor: 'background.paper', transform: 'scale(1.05)' }
                    }}
                >
                    <CaretLeft size={20} weight="bold" />
                </IconButton>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-1px' }}>Schedule</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', opacity: 0.7 }}>
                        Academic Timetable
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="AI Smart Import">
                        <IconButton 
                            onClick={() => setImportModalOpen(true)}
                            sx={{ 
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                            }}
                        >
                            <MagicWand size={22} weight="duotone" />
                        </IconButton>
                    </Tooltip>
                    <Avatar sx={{ 
                        bgcolor: 'primary.main', 
                        width: 44, height: 44, 
                        borderRadius: '14px',
                        boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}>
                        <GraduationCap size={26} weight="duotone" />
                    </Avatar>
                </Stack>
            </Box>

            {/* Day Selector - Premium Capsules */}
            <Box sx={{ px: 2, mb: 4, mt: 2 }}>
                <Tabs 
                    value={selectedDay} 
                    onChange={(e, v) => setSelectedDay(v)}
                    variant="scrollable"
                    scrollButtons={false}
                    sx={{
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTabs-flexContainer': { gap: 1.5 }
                    }}
                >
                    {DAYS.map((day, index) => (
                        <Tab 
                            key={day} 
                            label={
                                <Box sx={{ position: 'relative' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>{day.substring(0, 3)}</Typography>
                                    <Box sx={{ 
                                        width: 5, height: 5, borderRadius: '50%', 
                                        bgcolor: selectedDay === index ? 'white' : 'primary.main',
                                        mx: 'auto', mt: 0.5,
                                        opacity: schedule[index]?.length > 0 ? 1 : 0,
                                        transition: 'all 0.3s ease'
                                    }} />
                                </Box>
                            }
                            sx={{
                                minWidth: 64,
                                height: 74,
                                borderRadius: '22px',
                                bgcolor: selectedDay === index ? 'primary.main' : 'background.paper',
                                color: selectedDay === index ? 'white !important' : 'text.secondary',
                                border: `1px solid ${selectedDay === index ? 'primary.main' : alpha(theme.palette.divider, 0.1)}`,
                                boxShadow: selectedDay === index 
                                    ? `0 12px 24px ${alpha(theme.palette.primary.main, 0.3)}` 
                                    : '0 4px 12px rgba(0,0,0,0.02)',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&.Mui-selected': { 
                                    transform: 'translateY(-4px)',
                                },
                                '&:hover': {
                                    bgcolor: selectedDay === index ? 'primary.main' : alpha(theme.palette.primary.main, 0.05)
                                }
                            }}
                        />
                    ))}
                </Tabs>
            </Box>

            <Container maxWidth="sm">
                {/* Status Card - Hide on Work Days when viewing */}
                <AnimatePresence>
                    {(isCurrentEditing || isCurrentOffDay) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <Card sx={{ 
                                p: 2.5, borderRadius: '28px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                bgcolor: isCurrentOffDay ? alpha(theme.palette.warning.main, 0.03) : 'background.paper',
                                border: `2px dashed ${isCurrentOffDay ? alpha(theme.palette.warning.main, 0.3) : alpha(theme.palette.divider, 0.5)}`,
                                boxShadow: '0 10px 40px rgba(0,0,0,0.02)'
                            }}>
                                <Stack direction="row" spacing={2.5} alignItems="center">
                                    <Box sx={{ 
                                        p: 2, borderRadius: '18px', 
                                        bgcolor: isCurrentOffDay ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {isCurrentOffDay 
                                            ? <Coffee size={28} weight="duotone" color={theme.palette.warning.main} /> 
                                            : <Monitor size={28} weight="duotone" color={theme.palette.primary.main} />
                                        }
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
                                            {isCurrentOffDay ? 'Rest Day' : 'Work Day'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, opacity: 0.8 }}>
                                            {isCurrentOffDay ? 'No classes - recharging' : `${currentEntries.length} active sessions`}
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Switch 
                                    checked={isCurrentOffDay} 
                                    onChange={() => handleToggleOffDay(selectedDay)}
                                    color="warning"
                                    sx={{ 
                                        '& .MuiSwitch-thumb': { boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }
                                    }}
                                />
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {!isCurrentOffDay && (
                        <motion.div
                            key={selectedDay + (isCurrentEditing ? '-edit' : '-view')}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5, px: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.5px' }}>
                                    {DAYS[selectedDay]} Timeline
                                </Typography>
                                {!isCurrentEditing && (
                                    <Button 
                                        size="small" 
                                        variant="soft"
                                        startIcon={<PencilSimple weight="bold" />}
                                        onClick={() => setIsEditing(prev => ({ ...prev, [selectedDay]: true }))}
                                        sx={{ 
                                            borderRadius: '14px', 
                                            fontWeight: 800, 
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            color: 'primary.main',
                                            px: 2,
                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                                        }}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </Stack>

                            <Stack spacing={2.5}>
                                {currentEntries.map((entry, index) => (
                                    <Card key={entry.id} sx={{ 
                                        p: 0, borderRadius: '32px', 
                                        boxShadow: isCurrentEditing ? 'none' : '0 15px 45px rgba(0,0,0,0.04)',
                                        border: `1.5px solid ${isCurrentEditing ? alpha(theme.palette.divider, 0.5) : alpha(theme.palette.primary.main, 0.08)}`,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        bgcolor: 'background.paper',
                                        transition: 'transform 0.3s ease',
                                        '&:hover': { transform: isCurrentEditing ? 'none' : 'translateY(-2px)' }
                                    }}>
                                        {isCurrentEditing ? (
                                            <Box sx={{ p: 3 }}>
                                                <Grid container spacing={2.5}>
                                                    <Grid item xs={12}>
                                                        <TextField 
                                                            fullWidth 
                                                            label="Subject Name"
                                                            variant="filled"
                                                            placeholder="e.g. Advanced Mathematics"
                                                            value={entry.subject}
                                                            onChange={(e) => handleUpdateEntry(selectedDay, entry.id, 'subject', e.target.value)}
                                                            InputProps={{ 
                                                                disableUnderline: true,
                                                                sx: { borderRadius: '16px', fontWeight: 800, fontSize: '1rem', bgcolor: alpha(theme.palette.divider, 0.05) } 
                                                            }}
                                                            InputLabelProps={{ sx: { fontWeight: 700, color: 'text.secondary' } }}
                                                        />
                                                    </Grid>
                                                    
                                                    <Grid item xs={6}>
                                                        <TextField 
                                                            fullWidth 
                                                            type="time" 
                                                            label="Start"
                                                            variant="filled"
                                                            value={entry.startTime}
                                                            onChange={(e) => handleUpdateEntry(selectedDay, entry.id, 'startTime', e.target.value)}
                                                            InputProps={{ 
                                                                disableUnderline: true, 
                                                                sx: { borderRadius: '16px', fontWeight: 700, bgcolor: alpha(theme.palette.divider, 0.05) } 
                                                            }}
                                                            InputLabelProps={{ sx: { fontWeight: 700, color: 'text.secondary' } }}
                                                        />
                                                    </Grid>
                                                    
                                                    <Grid item xs={6}>
                                                        <TextField 
                                                            fullWidth 
                                                            type="time" 
                                                            label="End"
                                                            variant="filled"
                                                            value={entry.endTime}
                                                            onChange={(e) => handleUpdateEntry(selectedDay, entry.id, 'endTime', e.target.value)}
                                                            InputProps={{ 
                                                                disableUnderline: true, 
                                                                sx: { borderRadius: '16px', fontWeight: 700, bgcolor: alpha(theme.palette.divider, 0.05) } 
                                                            }}
                                                            InputLabelProps={{ sx: { fontWeight: 700, color: 'text.secondary' } }}
                                                        />
                                                    </Grid>
                                                    
                                                    <Grid item xs={12}>
                                                        <TextField 
                                                            fullWidth 
                                                            label="Room / Location"
                                                            variant="filled"
                                                            placeholder="e.g. Block C, Room 302"
                                                            value={entry.room}
                                                            onChange={(e) => handleUpdateEntry(selectedDay, entry.id, 'room', e.target.value)}
                                                            InputProps={{ 
                                                                disableUnderline: true, 
                                                                sx: { borderRadius: '16px', fontWeight: 700, bgcolor: alpha(theme.palette.divider, 0.05) } 
                                                            }}
                                                            InputLabelProps={{ sx: { fontWeight: 700, color: 'text.secondary' } }}
                                                        />
                                                    </Grid>

                                                    <IconButton 
                                                        onClick={() => handleRemoveEntry(selectedDay, entry.id)}
                                                        sx={{ 
                                                            position: 'absolute', top: 12, right: 12, 
                                                            color: 'error.main',
                                                            bgcolor: alpha(theme.palette.error.main, 0.05),
                                                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) },
                                                            width: 32, height: 32
                                                        }}
                                                    >
                                                        <Trash size={16} weight="bold" />
                                                    </IconButton>
                                                </Grid>
                                            </Box>
                                        ) : (
                                            <Stack direction="row" alignItems="stretch">
                                                {/* Left Time Badge */}
                                                <Box sx={{ 
                                                    width: 85, 
                                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    p: 2, borderRight: `1px solid ${alpha(theme.palette.divider, 0.05)}`
                                                }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main' }}>{entry.startTime}</Typography>
                                                    <Box sx={{ height: 20, width: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), my: 0.5, borderRadius: 1 }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.7rem' }}>{entry.endTime}</Typography>
                                                </Box>
                                                
                                                <Box sx={{ flexGrow: 1, p: 2.5, display: 'flex', alignItems: 'center' }}>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5, lineHeight: 1.2 }}>
                                                            {entry.subject || 'Untitled Session'}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary' }}>
                                                                <MapPin size={16} weight="duotone" color={theme.palette.primary.main} />
                                                                <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.8 }}>
                                                                    {entry.room || 'No Location'}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </Box>
                                                    
                                                    <Avatar sx={{ 
                                                        width: 42, height: 42, 
                                                        borderRadius: '14px',
                                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                        color: 'primary.main'
                                                    }}>
                                                        {index % 2 === 0 ? <BookOpen size={22} weight="duotone" /> : <Flask size={22} weight="duotone" />}
                                                    </Avatar>
                                                </Box>
                                            </Stack>
                                        )}
                                    </Card>
                                ))}

                                {isCurrentEditing && (
                                    <Button 
                                        fullWidth 
                                        variant="outlined" 
                                        startIcon={<Plus weight="bold" size={20} />}
                                        onClick={() => handleAddEntry(selectedDay)}
                                        sx={{ 
                                            py: 2.5, borderRadius: '28px', borderStyle: 'dashed', 
                                            borderWidth: 2,
                                            fontWeight: 900, color: 'text.secondary',
                                            bgcolor: alpha(theme.palette.primary.main, 0.01),
                                            '&:hover': { borderStyle: 'dashed', borderWidth: 2, bgcolor: alpha(theme.palette.primary.main, 0.04) }
                                        }}
                                    >
                                        Add Session
                                    </Button>
                                )}
                            </Stack>
                        </motion.div>
                    )}

                    {isCurrentOffDay && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        >
                            <Box sx={{ textAlign: 'center', py: isCurrentEditing ? 4 : 10, px: 3 }}>
                                <Box sx={{ 
                                    width: 140, height: 140, borderRadius: '50%', 
                                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    mx: 'auto', mb: 4,
                                    border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                                    position: 'relative'
                                }}>
                                    <Coffee size={70} weight="duotone" color={theme.palette.warning.main} />
                                    <motion.div 
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                        style={{ position: 'absolute', top: 20, right: 20 }}
                                    >
                                        <Typography sx={{ fontSize: '1.5rem' }}>✨</Typography>
                                    </motion.div>
                                </Box>
                                <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, letterSpacing: '-0.5px' }}>Day of Rest</Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700, opacity: 0.7, maxWidth: '280px', mx: 'auto', lineHeight: 1.6 }}>
                                    No academic sessions on the horizon. Time to power down and recharge.
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isCurrentEditing && (
                    <Stack spacing={1.5} sx={{ mt: isCurrentOffDay ? 2 : 5, px: 1 }}>
                        <Button 
                            fullWidth 
                            variant="contained" 
                            size="large"
                            startIcon={<Check weight="bold" />}
                            onClick={() => handleSaveDay(selectedDay)}
                            sx={{ 
                                py: 2.2, borderRadius: '24px', fontWeight: 900,
                                fontSize: '1rem',
                                boxShadow: `0 12px 35px ${alpha(theme.palette.primary.main, 0.3)}`,
                                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 15px 40px ${alpha(theme.palette.primary.main, 0.4)}` }
                            }}
                        >
                            Finalize {DAYS[selectedDay]}
                        </Button>
                        <Button 
                            fullWidth 
                            variant="soft" 
                            color="error"
                            startIcon={<X weight="bold" />}
                            onClick={() => handleCancelEdit(selectedDay)}
                            sx={{ 
                                py: 1.8, borderRadius: '20px', fontWeight: 800,
                                bgcolor: alpha(theme.palette.error.main, 0.05),
                                color: 'error.main',
                                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                            }}
                        >
                            Discard Changes
                        </Button>
                    </Stack>
                )}
            </Container>

            {/* Smart Import Dialog */}
            <Dialog 
                open={importModalOpen} 
                onClose={() => setImportModalOpen(false)}
                PaperProps={{
                    sx: { borderRadius: '28px', p: 1, maxWidth: '450px' }
                }}
            >
                <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <MagicWand size={28} weight="duotone" color={theme.palette.primary.main} />
                    AI Smart Import
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, fontWeight: 600 }}>
                        Paste your schedule JSON below. You can use an AI to scan a picture of your physical timetable and generate this format.
                    </Typography>
                    
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                            size="small" 
                            startIcon={<CopySimple size={16} weight="bold" />}
                            onClick={() => {
                                const singleDayExample = `[
    {"subject": "Data Structures", "room": "C-415", "startTime": "09:20", "endTime": "10:10"}
]`;
                                const multiDayExample = `{
    "0": [{"subject": "Math", "room": "101", "startTime": "09:00", "endTime": "10:00"}],
    "1": [{"subject": "Physics", "room": "202", "startTime": "11:00", "endTime": "12:00"}]
}`;
                                const aiPrompt = `Please scan my timetable image and extract the data into this EXACT JSON format. 

You can provide a single day array:
${singleDayExample}

OR a full week object (0=Mon, 6=Sun):
${multiDayExample}

Only return the JSON, nothing else. Focus on capturing session names, room numbers, start times, and end times accurately.`;
                                navigator.clipboard.writeText(aiPrompt);
                                toast.success("Advanced AI Prompt copied!");
                            }}
                            sx={{ 
                                borderRadius: '10px', 
                                textTransform: 'none', 
                                fontWeight: 800,
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                            }}
                        >
                            Copy AI Prompt
                        </Button>
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        rows={6}
                        placeholder='[{"subject": "Math", "room": "101", "startTime": "09:00", "endTime": "10:00"}]'
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        variant="filled"
                        InputProps={{
                            disableUnderline: true,
                            sx: { borderRadius: '16px', bgcolor: alpha(theme.palette.divider, 0.05), fontFamily: 'monospace', fontSize: '0.85rem' }
                        }}
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: '14px' }}>
                        <Sparkle size={18} weight="fill" color={theme.palette.info.main} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>
                            Parsed sessions will appear in "Edit Mode" for your review.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setImportModalOpen(false)} sx={{ fontWeight: 800, color: 'text.secondary' }}>Cancel</Button>
                    <Button 
                        onClick={handleImportJson}
                        variant="contained" 
                        disabled={!jsonInput.trim()}
                        sx={{ borderRadius: '14px', px: 3, fontWeight: 800 }}
                    >
                        Process Magic
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Schedule;
