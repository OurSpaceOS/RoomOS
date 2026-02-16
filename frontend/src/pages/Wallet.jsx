
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Box, 
    Container, 
    Typography, 
    Stack, 
    Button, 
    IconButton, 
    Avatar, 
    Grid,
    CircularProgress,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    useTheme,
    Chip,
    Paper,
    Divider,
    alpha,
    Card,
    InputBase
} from '@mui/material';
import { 
    Plus, 
    TrendUp, 
    TrendDown, 
    ArrowsClockwise, 
    Trash, 
    X,
    Hamburger,
    ShoppingCart,
    Car,
    Lightning,
    House,
    FilmStrip,
    DotsThree,
    Warning,
    Receipt,
    ArrowUpRight,
    ArrowDownLeft,
    CaretRight,
    Handshake,
    CalendarBlank,
    ShoppingBag,
    FirstAid,
    Television,
    Gift,
    Wrench,
    Coffee
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import useAuthStore from '../store/auth';
import useThemeStore from '../store/themeStore';

const CATEGORIES = [
    { id: 'food', label: 'Food', icon: Hamburger, color: '#f59e0b' },
    { id: 'coffee', label: 'Cafe', icon: Coffee, color: '#d97706' },
    { id: 'groceries', label: 'Grocery', icon: ShoppingCart, color: '#10b981' },
    { id: 'shopping', label: 'Shop', icon: ShoppingBag, color: '#ec4899' },
    { id: 'transport', label: 'Ride', icon: Car, color: '#3b82f6' },
    { id: 'utilities', label: 'Bills', icon: Lightning, color: '#8b5cf6' },
    { id: 'rent', label: 'Rent', icon: House, color: '#6366f1' },
    { id: 'fun', label: 'Fun', icon: FilmStrip, color: '#f43f5e' },
    { id: 'health', label: 'Health', icon: FirstAid, color: '#ef4444' },
    { id: 'subs', label: 'Subs', icon: Television, color: '#06b6d4' },
    { id: 'gift', label: 'Gift', icon: Gift, color: '#8b5cf6' },
    { id: 'fix', label: 'Fix', icon: Wrench, color: '#64748b' },
    { id: 'settle', label: 'Settle', icon: Handshake, color: '#10b981' },
    { id: 'other', label: 'Other', icon: DotsThree, color: '#94a3b8' }
];

const Wallet = () => {
    const theme = useTheme();
    const { mode } = useThemeStore();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    
    // Pagination state
    const [visibleCount, setVisibleCount] = useState(15);
    
    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    
    // Form state
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('other');
    const [splitBetween, setSplitBetween] = useState([]);

    // Logic for current month
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    // Queries
    const { data: transData, isLoading: transLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => api.get('/transactions/list')
    });

    const { data: membersData, isLoading: membersLoading } = useQuery({
        queryKey: ['members'],
        queryFn: () => api.get('/group/members')
    });

    // Mutations
    const addMutation = useMutation({
        mutationFn: (payload) => api.post('/transactions/add', payload),
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions']);
            setIsAddModalOpen(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.post('/transactions/delete', { transaction_id: id }),
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions']);
            setIsDeleteModalOpen(false);
            setExpenseToDelete(null);
        }
    });

    const recalculateMutation = useMutation({
        mutationFn: () => api.post('/transactions/recalculate'),
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions']);
        }
    });

    // Calculations based on legacy logic
    const { stats, filteredTransactions } = useMemo(() => {
        if (!transData) return { stats: { debt: 0, surplus: 0, monthlyTotal: 0 }, filteredTransactions: [] };
        
        let debt = 0, surplus = 0;
        (transData.balances || []).forEach(b => {
            const val = parseFloat(b.balance);
            if (val > 0) surplus += val;
            else if (val < 0) debt += Math.abs(val);
        });

        const allTx = transData.transactions || [];
        const filtered = allTx.filter(t => {
            const payerId = parseInt(t.user_id);
            const myId = parseInt(user.id);
            let split = [];
            try { split = typeof t.split_between === 'string' ? JSON.parse(t.split_between) : (t.split_between || []); } catch(e) {}
            return payerId === myId || split.map(id => parseInt(id)).includes(myId);
        });

        const monthlyTotal = filtered.filter(t => {
            const d = new Date(t.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && parseInt(t.user_id) === parseInt(user.id);
        }).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        return { stats: { debt, surplus, monthlyTotal }, filteredTransactions: filtered };
    }, [transData, user.id]);

    const resetForm = () => {
        setDesc(''); setAmount(''); setCategory('other');
        if (membersData?.members) setSplitBetween(membersData.members.map(m => m.id));
    };

    if (transLoading || membersLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', bgcolor: 'background.default' }}>
                <CircularProgress thickness={4} size={48} sx={{ color: 'primary.main' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 12, transition: 'background-color 0.3s ease' }}>
            {/* Header Area */}
            <Box sx={{ px: 3, pt: 6, pb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-1.5px', mb: 0.5 }}>
                    Wallet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.7 }}>
                    Manage shared expenses & settlements
                </Typography>
            </Box>

            <Container maxWidth="sm" sx={{ mt: 2 }}>
                
                {/* 1. Fluid Stats Surface (Fixed Alignment & Overlap) */}
                <Card sx={{ 
                    p: 2, borderRadius: '24px', mb: 2,
                    bgcolor: 'surface.main',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                    border: 'none',
                    background: mode === 'light' ? 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)' : 'background.paper'
                }}>
                    <Stack 
                        direction="row" 
                        divider={<Divider orientation="vertical" flexItem sx={{ my: 0.5, opacity: 0.1 }} />}
                        spacing={0}
                        alignItems="center"
                    >
                        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box sx={{ 
                                    bgcolor: alpha(theme.palette.error.main, 0.1), 
                                    p: 1, borderRadius: '12px', color: 'error.main', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <TrendDown size={20} weight="bold" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', letterSpacing: '0.5px', display: 'block' }}>YOU OWE</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>₹{Math.round(stats.debt)}</Typography>
                                </Box>
                            </Stack>
                        </Box>
                        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box sx={{ 
                                    bgcolor: alpha(theme.palette.success.main, 0.1), 
                                    p: 1, borderRadius: '12px', color: 'success.main', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <TrendUp size={20} weight="bold" />
                                </Box>
                                <Box>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem', letterSpacing: '0.5px', display: 'block' }}>OWED TO YOU</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>₹{Math.round(stats.surplus)}</Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Stack>
                </Card>

                {/* 2. Spotlight Spending Card (Compressed) */}
                <Card sx={{ 
                    p: 2.5, borderRadius: '24px', mb: 3, 
                    bgcolor: 'primary.main', color: 'white',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    border: 'none',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                {monthName} Personal Spend
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
                                ₹{Math.round(stats.monthlyTotal)}
                            </Typography>
                        </Box>
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 1.5, borderRadius: '16px', display: 'flex' }}>
                            <Receipt size={24} weight="duotone" />
                        </Box>
                    </Stack>
                </Card>

                {/* 3. Roommate Balances Section */}
                <Box sx={{ mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Roommate Net</Typography>
                        <IconButton size="small" onClick={() => recalculateMutation.mutate()} sx={{ color: 'primary.main' }}>
                            <ArrowsClockwise size={16} weight="bold" />
                        </IconButton>
                    </Stack>
                    <Stack spacing={1}>
                        {transData.balances?.filter(b => Math.abs(parseFloat(b.balance)) > 1).map((balance, index) => {
                            const amount = parseFloat(balance.balance);
                            const isOwed = amount > 0;
                            const member = membersData?.members?.find(m => m.id === balance.other_user_id) || { name: 'Roomie' };
                            
                            return (
                                <Card 
                                    key={index}
                                    sx={{ 
                                        p: 2, borderRadius: '20px', 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: 'none'
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar sx={{ 
                                            width: 36, height: 36, 
                                            bgcolor: 'secondary.container', color: 'secondary.onContainer', 
                                            fontWeight: 800, fontSize: '0.85rem'
                                        }}>{member.name.charAt(0)}</Avatar>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{member.name}</Typography>
                                            <Typography variant="caption" sx={{ color: isOwed ? 'success.main' : 'error.main', fontWeight: 700 }}>
                                                {isOwed ? `owes you` : `you owe`}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <Typography variant="body1" sx={{ fontWeight: 900, color: isOwed ? 'success.main' : 'error.main' }}>
                                        ₹{Math.round(Math.abs(amount))}
                                    </Typography>
                                </Card>
                            );
                        })}
                    </Stack>
                </Box>

                {/* 4. Recent Activity */}
                <Box sx={{ mb: 4 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Recent History</Typography>
                        <Chip label={`${filteredTransactions.length} items`} size="small" sx={{ fontWeight: 700, bgcolor: 'action.hover', fontSize: '0.7rem' }} />
                    </Stack>

                    <Stack spacing={1}>
                        {filteredTransactions.slice(0, visibleCount).map((t) => {
                            const isPayer = parseInt(t.user_id) === parseInt(user.id);
                            const catMatch = t.description.match(/^\[(.*?)\]/);
                            const catId = catMatch ? catMatch[1].toLowerCase() : 'other';
                            const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[7];
                            const displayDesc = t.description.replace(/^\[.*?\]\s*/, '');
                            const payer = membersData?.members?.find(m => m.id === t.user_id);
                            
                            return (
                                <Card 
                                    key={t.id} 
                                    onClick={() => { setSelectedExpense(t); setIsDetailModalOpen(true); }}
                                    sx={{ 
                                        p: 1.5, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        cursor: 'pointer', boxShadow: 'none', border: mode === 'light' ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.05)',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box sx={{ 
                                            width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(cat.color, 0.1), 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color
                                        }}>
                                            <cat.icon size={20} weight="duotone" />
                                        </Box>
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{displayDesc}</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
                                                {isPayer ? 'You' : (payer?.name || 'Roomie')} paid • ₹{Math.round(parseFloat(t.amount))}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                    <CaretRight size={16} weight="bold" color={theme.palette.text.disabled} />
                                </Card>
                            );
                        })}
                        {visibleCount < filteredTransactions.length && (
                            <Button fullWidth onClick={() => setVisibleCount(v => v + 15)} sx={{ py: 1, fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>
                                LOAD MORE
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Container>

            {/* TRULY FLOATING ADD BUTTON */}
            <Box sx={{ position: 'fixed', bottom: 90, right: 20, zIndex: 1000 }}>
                <Button 
                    variant="contained" 
                    startIcon={<Plus size={20} weight="bold" />}
                    onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                    sx={{ 
                        borderRadius: '20px', py: 1.5, px: 3, 
                        fontWeight: 900, textTransform: 'none',
                        bgcolor: 'primary.main', color: 'white',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.05)' },
                        transition: 'all 0.2s'
                    }}
                >
                    Add Expense
                </Button>
            </Box>

            {/* RE-ENGINEERED ADD EXPENSE MODAL (COMPRESSED) */}
            <Dialog 
                open={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                fullWidth maxWidth="xs" 
                PaperProps={{ sx: { borderRadius: '28px', p: 0.5, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 2, pb:1, fontSize: '1.1rem' }}>
                    New Transaction
                    <IconButton onClick={() => setIsAddModalOpen(false)} sx={{ position: 'absolute', right: 12, top: 12 }} size="small">
                        <X size={18} weight="bold"/>
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 2, pb: 2 }}>
                    <Stack spacing={2}>
                        {/* Shrunk Amount Display */}
                        <Box sx={{ 
                            p: 1.5, bgcolor: 'action.hover', borderRadius: '16px', textAlign: 'center',
                            border: `1.5px solid ${alpha(theme.palette.primary.main, 0.03)}`
                        }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mb: 0.2, display: 'block', letterSpacing: '0.5px', fontSize: '0.6rem' }}>AMOUNT</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>₹</Typography>
                                <InputBase 
                                    autoFocus type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    sx={{ fontSize: '1.8rem', fontWeight: 900, color: 'text.primary', width: 'auto', '& input': { textAlign: 'center' } }}
                                />
                            </Box>
                        </Box>

                        <TextField 
                            placeholder="Description" fullWidth value={desc} onChange={(e) => setDesc(e.target.value)} variant="standard"
                            InputProps={{ disableUnderline: true, sx: { fontSize: '0.9rem', fontWeight: 700, px: 1 } }}
                            sx={{ borderBottom: `1.5px solid ${alpha(theme.palette.divider, 0.3)}`, pb: 0.2 }}
                        />

                        {/* Category Grid Selection */}
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block', fontSize: '0.6rem' }}>CATEGORY</Typography>
                            <Grid container spacing={1}>
                                {CATEGORIES.map(cat => (
                                    <Grid item xs={3} key={cat.id}>
                                        <Box 
                                            onClick={() => setCategory(cat.id)}
                                            sx={{ 
                                                p: 0.8, borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3,
                                                cursor: 'pointer', transition: 'all 0.2s', 
                                                bgcolor: category === cat.id ? alpha(cat.color, 0.1) : 'transparent',
                                                color: category === cat.id ? cat.color : 'text.primary',
                                                border: `1.5px solid ${category === cat.id ? alpha(cat.color, 0.2) : 'transparent'}`,
                                                '&:hover': { bgcolor: alpha(cat.color, 0.05) }
                                            }}
                                        >
                                            <cat.icon size={22} weight="duotone" />
                                            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.53rem' }}>{cat.label.toUpperCase()}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>

                        {/* High-End Roommate Select */}
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, display: 'block', fontSize: '0.65rem' }}>SPLIT WITH</Typography>
                            <Stack spacing={0.8}>
                                {membersData?.members?.map(m => {
                                    const isSelected = splitBetween.includes(m.id);
                                    return (
                                        <Box 
                                            key={m.id}
                                            onClick={() => setSplitBetween(s => isSelected ? s.filter(id => id !== m.id) : [...s, m.id])}
                                            sx={{ 
                                                p: 1.2, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 1.5,
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                                                border: `1.5px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.15)}`
                                            }}
                                        >
                                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 800 }}>{m.name.charAt(0)}</Avatar>
                                            <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, fontSize: '0.85rem' }}>{m.name}</Typography>
                                            {isSelected && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />}
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                    <Button 
                        fullWidth variant="contained" 
                        disabled={!amount || !desc || splitBetween.length === 0}
                        onClick={() => addMutation.mutate({ description: `[${category.toUpperCase()}] ${desc}`, amount: parseFloat(amount), split_between: splitBetween })}
                        sx={{ py: 1.5, borderRadius: '16px', fontWeight: 900, bgcolor: 'primary.main', fontSize: '0.9rem' }}
                    >
                        Confirm Transaction
                    </Button>
                </DialogActions>
            </Dialog>

            {/* EXPENSE DETAIL MODAL (SHRUNK) */}
            <Dialog 
                open={isDetailModalOpen} 
                onClose={() => setIsDetailModalOpen(false)} 
                fullWidth maxWidth="xs" 
                PaperProps={{ sx: { borderRadius: '32px', p: 0.5 } }}
            >
                {selectedExpense && (() => {
                    const payer = membersData?.members?.find(m => m.id === selectedExpense.user_id) || { name: 'Roomie' };
                    let splitIds = [];
                    try { splitIds = typeof selectedExpense.split_between === 'string' ? JSON.parse(selectedExpense.split_between) : (selectedExpense.split_between || []); } catch(e) {}
                    const share = parseFloat(selectedExpense.amount) / (splitIds.length || 1);

                    return (
                        <Box>
                            <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 0, fontSize: '1rem' }}>
                                Entry Details
                                <IconButton onClick={() => setIsDetailModalOpen(false)} sx={{ position: 'absolute', right: 12, top: 12 }} size="small">
                                    <X size={18} weight="bold"/>
                                </IconButton>
                            </DialogTitle>
                            <DialogContent sx={{ px: 2.5, pb: 2.5 }}>
                                <Stack spacing={2.5} sx={{ mt: 1 }}>
                                    <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: '24px', textAlign: 'center' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>{selectedExpense.description}</Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{Math.round(parseFloat(selectedExpense.amount))}</Typography>
                                        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 1, opacity: 0.7 }}>
                                            <CalendarBlank size={14} weight="bold" />
                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                {new Date(selectedExpense.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </Typography>
                                        </Stack>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'block', letterSpacing: '0.5px', fontSize: '0.65rem' }}>PAYMENT INFO</Typography>
                                        <Card variant="filled" sx={{ p: 1.5, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.container', color: 'primary.onContainer', border: 'none' }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'white', color: 'primary.main', fontWeight: 800, fontSize: '0.8rem' }}>{payer.name.charAt(0)}</Avatar>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 800 }}>{payer.name}</Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>Paid the full amount</Typography>
                                            </Box>
                                        </Card>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'block', letterSpacing: '0.5px', fontSize: '0.65rem' }}>INDIVIDUAL SHARES</Typography>
                                        <Stack spacing={0.8}>
                                            {splitIds.map(id => {
                                                const m = membersData?.members?.find(mem => mem.id === id);
                                                return (
                                                    <Box key={id} sx={{ px: 2, py: 1.2, borderRadius: '14px', bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{m?.name || 'Group Member'}</Typography>
                                                        <Typography variant="caption" sx={{ fontWeight: 900 }}>₹{Math.round(share)}</Typography>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </DialogContent>
                            <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
                                {parseInt(selectedExpense.user_id) === parseInt(user.id) && (
                                    <Button fullWidth onClick={() => { setIsDetailModalOpen(false); setExpenseToDelete(selectedExpense); setIsDeleteModalOpen(true); }} color="error" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Remove This Expense</Button>
                                )}
                            </DialogActions>
                        </Box>
                    );
                })()}
            </Dialog>

            {/* DELETE CONFIRM */}
            <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} PaperProps={{ sx: { borderRadius: '40px' } }}>
                <DialogContent sx={{ textAlign: 'center', p: 5 }}>
                    <Box sx={{ bgcolor: 'error.container', color: 'error.main', width: 80, height: 80, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                        <Warning size={48} weight="bold" />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>Permanently Delete?</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 1 }}>This record will be removed from everyone's wallet.</Typography>
                    <Stack spacing={2} sx={{ mt: 5 }}>
                        <Button fullWidth variant="contained" color="error" onClick={() => deleteMutation.mutate(expenseToDelete.id)} sx={{ borderRadius: '20px', py: 2, fontWeight: 800 }}>Yes, Delete Recording</Button>
                        <Button fullWidth onClick={() => setIsDeleteModalOpen(false)} sx={{ fontWeight: 800, color: 'text.secondary' }}>Keep Expense</Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default Wallet;
