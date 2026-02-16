
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  Grid, 
  Button, 
  Chip,
  IconButton,
  CircularProgress,
  Stack,
  useTheme,
  Avatar,
  Paper,
} from '@mui/material';
import { 
    DiceFive, 
    CalendarCheck, 
    Sun, 
    Moon, 
    Clock,
    CaretRight,
    ArrowsClockwise,
    Bell,
    CheckCircle,
    User,
    CookingPot,
    Sparkle,
    Plus,
    Wallet,
    ChartPieSlice,
    ArrowUpRight,
    ArrowDownLeft,
    Gear
} from '@phosphor-icons/react';
import api from '../api';
import useAuthStore from '../store/auth';
import useThemeStore from '../store/themeStore';
import useSettingsStore from '../store/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { token, user } = useAuthStore();
    const { mode, toggleTheme } = useThemeStore();
    const { getSetting, hasMaid } = useSettingsStore();
    const [currentTime, setCurrentTime] = useState(new Date());

    const isMaidPresent = hasMaid();
    const monthlyBudget = parseFloat(getSetting('monthly_budget', '0'));

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const indiaTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(currentTime);

    const [dayName, dateStr, timeStr] = indiaTime.split(', ');

    const currentHour = parseInt(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        hour12: false
    }).format(currentTime), 10);
    
    const isMorning = currentHour < 16; 

    // Queries
    const { data: rosterData, isLoading: rosterLoading } = useQuery({
        queryKey: ['roster'],
        queryFn: () => api.get('/roster/week'),
        enabled: !isMaidPresent
    });

    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => api.get('/tasks/today'),
        enabled: !isMaidPresent
    });

    const { data: transData, isLoading: transLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => api.get('/transactions/list'),
        enabled: isMaidPresent
    });

    const { data: maidConfig } = useQuery({
        queryKey: ['maidConfig'],
        queryFn: () => api.get('/settings/group-get?key=maid_config')
    });

    const getMaidSummaryParams = () => {
        if (!maidConfig?.value) return null;
        const cfg = typeof maidConfig.value === 'string' ? JSON.parse(maidConfig.value) : maidConfig.value;
        if (!cfg.cycleStart) return null;
        const cycleStart = new Date(cfg.cycleStart);
        const now = new Date();
        const diffDays = Math.floor((now - cycleStart) / (1000 * 60 * 60 * 24));
        const cycleOffset = Math.floor(diffDays / 30);
        const start = new Date(cycleStart);
        start.setDate(start.getDate() + (cycleOffset * 30));
        const end = new Date(start);
        end.setDate(end.getDate() + 29);
        return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0], config: cfg };
    };

    const maidParams = getMaidSummaryParams();

    const { data: maidAttData } = useQuery({
        queryKey: ['maidAtt', maidParams?.from, maidParams?.to],
        queryFn: () => api.get(`/settings/group-get-range?key=maid_att&from=${maidParams.from}&to=${maidParams.to}`),
        enabled: !!maidParams
    });

    // ... (rest of logic remains same, just updating UI)
    const getActiveTeam = () => {
        if (!rosterData?.roster) return { team: [], passenger: '...' };
        const dayMap = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6 };
        const currentDayName = dayName.trim();
        const dayIndex = dayMap[currentDayName];
        const dayData = rosterData.roster.find(d => d.day_index === dayIndex);
        if (!dayData) return { team: [], passenger: '...' };
        const morningTeam = JSON.parse(dayData.morning || '[]').map(x => typeof x === 'string' ? x : x.n);
        const nightTeam = JSON.parse(dayData.night || '[]').map(x => typeof x === 'string' ? x : x.n);
        return {
            team: isMorning ? morningTeam : nightTeam,
            passenger: isMorning ? dayData.passenger_m : dayData.passenger_n
        };
    };

    const { team, passenger } = getActiveTeam();

    const maidStats = React.useMemo(() => {
        if (!maidAttData?.entries || !maidParams) return null;
        let totalShifts = 0, came = 0;
        maidAttData.entries.forEach(e => {
            const val = typeof e.value === 'string' ? JSON.parse(e.value) : e.value;
            if (val.m) totalShifts++;
            if (val.e) totalShifts++;
            if (val.m || val.e) came++;
        });
        const totalSalary = maidParams.config.rate * maidParams.config.split;
        const total = Math.round(totalShifts * (totalSalary / 60));
        const perPerson = Math.round(total / (maidParams.config.split || 1));
        return { came, total, perPerson };
    }, [maidAttData, maidParams]);

    const financialStats = React.useMemo(() => {
        if (!transData) return null;
        
        let totalOwe = 0;
        let totalOwed = 0;
        if (transData.balances) {
            transData.balances.forEach(b => {
                const amt = parseFloat(b.balance);
                if (amt > 0) totalOwed += amt;
                else if (amt < 0) totalOwe += Math.abs(amt);
            });
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const allTransactions = transData.transactions || [];
        const userTransactions = allTransactions.filter(t => t.user_id === user?.id);
        
        const monthlyTransactions = userTransactions.filter(t => {
            const date = new Date(t.created_at);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const spentThisMonth = monthlyTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        const budgetPercent = monthlyBudget > 0 ? Math.min((spentThisMonth / monthlyBudget) * 100, 100) : 0;
        const netBalance = totalOwed - totalOwe;

        return { 
            totalOwe, 
            totalOwed, 
            spentThisMonth, 
            monthlyBudget,
            budgetPercent, 
            netBalance,
            recentActivity: userTransactions.slice(0, 8) 
        };
    }, [transData, user?.id, monthlyBudget]);

    if ((!isMaidPresent && (rosterLoading || tasksLoading)) || (isMaidPresent && transLoading)) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
                <CircularProgress thickness={4} size={48} sx={{ color: 'primary.main' }} />
            </Box>
        );
    }

    const greeting = () => {
        if (currentHour < 12) return "Good Morning";
        if (currentHour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: 'background.default',
            pb: 12,
            transition: 'background-color 0.3s ease'
        }}>
            {/* Minimal Header */}
            <Box sx={{ px: 3, pt: 6, pb: 1 }}>
                <Typography 
                    variant="h4" 
                    sx={{ 
                        fontWeight: 700, 
                        color: 'text.primary',
                        letterSpacing: '-1.2px',
                    }}
                >
                    {greeting()}, <Box component="span" sx={{ color: 'primary.main' }}>{user?.name?.split(' ')[0]}</Box>
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ mt: 2 }}>
                {!isMaidPresent ? (
                    /* CHORE MODE: M3 Redesign */
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card variant="outlined" sx={{ 
                            borderRadius: '28px', 
                            bgcolor: mode === 'light' 
                                ? (isMorning ? '#FFF4E5' : '#E8EAF6')
                                : (isMorning ? 'rgba(255, 183, 77, 0.08)' : 'rgba(121, 134, 203, 0.08)'),
                            border: mode === 'light' ? 'none' : `1px solid ${theme.palette.divider}`,
                            mb: 3,
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ p: 4 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                    <Chip 
                                        label={isMorning ? 'Morning Shift' : 'Night Shift'} 
                                        sx={{ 
                                            bgcolor: mode === 'light' 
                                                ? (isMorning ? '#FFD180' : '#C5CAE9')
                                                : (isMorning ? '#E65100' : '#283593'), 
                                            color: mode === 'light'
                                                ? (isMorning ? '#795548' : '#3F51B5')
                                                : '#ffffff',
                                            fontWeight: 700,
                                            borderRadius: '8px'
                                        }} 
                                    />
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>{timeStr}</Typography>
                                </Stack>
                                <Typography variant="h3" sx={{ fontWeight: 400, mb: 1, color: 'text.primary' }}>
                                    {team.length ? team.join(' & ') : 'Unassigned'}
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    Current Duty: <Box component="span" sx={{ color: 'primary.main' }}>Cooking & Cleaning</Box>
                                </Typography>
                            </Box>
                            <Box sx={{ 
                                px: 4, py: 2, 
                                bgcolor: mode === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', 
                                borderTop: `1px solid ${theme.palette.divider}`,
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Passenger
                                    </Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{passenger || 'Not Set'}</Typography>
                                </Box>
                                <Chip label="Relaxing" variant="filled" size="small" sx={{ bgcolor: 'success.container', color: 'success.onContainer', fontWeight: 600 }} />
                            </Box>
                        </Card>
                        
                        <Grid container spacing={2}>
                            <Grid size={6}>
                                <Card variant="filled" sx={{ 
                                    p: 3, 
                                    borderRadius: '24px', 
                                    bgcolor: 'primary.container', 
                                    color: 'primary.onContainer',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                    height: '100%'
                                }}>
                                    <CalendarCheck size={32} weight="duotone" />
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8 }}>MAID BILL</Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 600 }}>₹{maidStats?.perPerson}</Typography>
                                    </Box>
                                </Card>
                            </Grid>
                            <Grid size={6}>
                                <Card variant="filled" sx={{ 
                                    p: 3, 
                                    borderRadius: '24px', 
                                    bgcolor: 'secondary.container', 
                                    color: 'secondary.onContainer',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                    height: '100%'
                                }}>
                                    <DiceFive size={32} weight="duotone" />
                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.8 }}>TASKS</Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 600 }}>{tasksData?.tasks?.length || 0}</Typography>
                                    </Box>
                                </Card>
                            </Grid>
                        </Grid>
                    </motion.div>
                ) : (
                    /* FINTECH MODE: M3 Redesign */
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Elevated Spotlight Card */}
                        <Card sx={{ 
                            p: 3, 
                            borderRadius: '28px', 
                            bgcolor: 'surface.main',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            mb: 3,
                            position: 'relative',
                            overflow: 'hidden',
                            border: mode === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                    <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '1px' }}>
                                        Monthly Budget
                                    </Typography>
                                    <Chip 
                                        label={financialStats?.spentThisMonth > financialStats?.monthlyBudget ? 'Over Budget' : 'On Track'} 
                                        size="small"
                                        sx={{ 
                                            bgcolor: financialStats?.spentThisMonth > financialStats?.monthlyBudget ? 'error.container' : 'success.container',
                                            color: financialStats?.spentThisMonth > financialStats?.monthlyBudget ? 'error.onContainer' : 'success.onContainer',
                                            fontWeight: 700,
                                            height: 24,
                                            fontSize: '0.65rem'
                                        }}
                                    />
                                </Stack>
                                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
                                    <Typography variant="h2" sx={{ 
                                        fontWeight: 800, 
                                        fontSize: '3rem', 
                                        letterSpacing: '-2px', 
                                        color: 'text.primary'
                                    }}>
                                        ₹{Math.round(financialStats?.spentThisMonth)}
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        / ₹{Math.round(financialStats?.monthlyBudget)}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 3 }}>
                                    {financialStats?.spentThisMonth > financialStats?.monthlyBudget 
                                        ? `Exceeded by ₹${Math.round(financialStats.spentThisMonth - financialStats.monthlyBudget)}` 
                                        : `₹${Math.round(financialStats?.monthlyBudget - financialStats?.spentThisMonth)} remaining for this month`}
                                </Typography>
                                
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>Budget utilization</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{Math.round(financialStats?.budgetPercent)}%</Typography>
                                    </Stack>
                                    <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${financialStats?.budgetPercent}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            style={{ 
                                                height: '100%', 
                                                backgroundColor: financialStats?.budgetPercent > 90 ? theme.palette.error.main : theme.palette.primary.main, 
                                                borderRadius: 4 
                                            }} 
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </Card>

                        {/* M3 Filled Cards Grid - Strict 2x2 */}
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            {[
                                { label: 'My Spent', value: financialStats?.spentThisMonth, color: 'primary', icon: <ArrowUpRight /> },
                                { label: 'You Owe', value: financialStats?.totalOwe, color: 'error', icon: <ArrowDownLeft /> },
                                { label: 'Owed to You', value: financialStats?.totalOwed, color: 'success', icon: <ArrowUpRight /> },
                                { label: 'Maid Share', value: maidStats?.perPerson, color: 'secondary', icon: <User /> }
                            ].map((item, i) => (
                                <Grid size={6} key={i}>
                                    <Card variant="filled" sx={{ 
                                        p: 2.5, 
                                        borderRadius: '24px', 
                                        bgcolor: `${item.color}.container`,
                                        color: `${item.color}.onContainer`,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5,
                                        border: mode === 'light' ? '1px solid rgba(0,0,0,0.02)' : '1px solid rgba(255,255,255,0.05)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <Box sx={{ 
                                            bgcolor: 'background.paper', 
                                            p: 1, 
                                            borderRadius: '12px', 
                                            color: `${item.color}.main`, 
                                            display: 'flex',
                                            width: 'fit-content',
                                            boxShadow: mode === 'light' ? '0 2px 8px rgba(0,0,0,0.03)' : '0 4px 12px rgba(0,0,0,0.2)'
                                        }}>
                                            {React.cloneElement(item.icon, { size: 20, weight: 'duotone' })}
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.7, display: 'block', mb: 0.5, letterSpacing: '0.5px', fontSize: '0.65rem' }}>
                                                {item.label.toUpperCase()}
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>₹{Math.round(item.value)}</Typography>
                                        </Box>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        {/* Activity List: M3 Outlined Cards */}
                        <Box sx={{ px: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>Recent Activity</Typography>
                                <Button 
                                    size="small" 
                                    onClick={() => navigate('/transactions')}
                                    sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700 }}
                                >
                                    View History
                                </Button>
                            </Stack>

                            <Stack spacing={1.5}>
                                {financialStats?.recentActivity?.map((t, idx) => (
                                    <Card 
                                        key={idx} 
                                        variant="outlined" 
                                        sx={{ 
                                            p: 2, 
                                            borderRadius: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            border: `1px solid ${theme.palette.divider}`,
                                            bgcolor: 'transparent',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <Avatar sx={{ 
                                            width: 44, height: 44, 
                                            bgcolor: t.user_id === user?.id ? 'primary.container' : (mode === 'light' ? '#f0f0f0' : 'rgba(255,255,255,0.05)'),
                                            color: t.user_id === user?.id ? 'primary.onContainer' : 'text.primary',
                                        }}>
                                            {t.description?.toLowerCase().includes('food') ? <CookingPot weight="duotone" /> : 
                                             t.description?.toLowerCase().includes('grocer') ? <Sparkle weight="duotone" /> : 
                                             <Wallet weight="duotone" />}
                                        </Avatar>

                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                                {t.description || 'General Expense'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                {t.user_id === user?.id ? 'You' : t.user_name} • {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="body1" sx={{ fontWeight: 800, color: t.user_id === user?.id ? 'error.main' : 'success.main' }}>
                                                {t.user_id === user?.id ? '-' : '+'}₹{Math.round(t.amount)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                                {t.category || 'Shared'}
                                            </Typography>
                                        </Box>
                                    </Card>
                                ))}
                            </Stack>
                        </Box>
                    </motion.div>
                )}
            </Container>

            {/* M3 Floating Action Button */}
            <AnimatePresence>
                {isMaidPresent && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5, y: 50 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.5, y: 50 }}
                        style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 1000 }}
                    >
                        <Button 
                            variant="contained" 
                            onClick={() => navigate('/transactions')}
                            sx={{ 
                                py: 1.5, px: 2, 
                                borderRadius: '24px', 
                                fontWeight: 800, 
                                boxShadow: mode === 'light' ? '0 8px 24px rgba(0,0,0,0.15)' : '0 12px 32px rgba(0,0,0,0.4)',
                                textTransform: 'none',
                                fontSize: '0.7rem',
                                display: 'flex', gap: 1.5,
                                bgcolor: 'primary.main',
                                color: mode === 'light' ? 'white' : '#041e49',
                                '&:hover': {
                                    bgcolor: mode === 'light' ? 'primary.dark' : '#d3e3fd',
                                    boxShadow: mode === 'light' ? '0 12px 30px rgba(0,0,0,0.2)' : '0 16px 40px rgba(0,0,0,0.5)',
                                    transform: 'translateY(-2px)'
                                },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            <Plus size={20} weight="bold" />
                            <Typography variant="button" sx={{ fontWeight: 800 }}>Add Expense</Typography>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </Box>
    );
};

export default Dashboard;
