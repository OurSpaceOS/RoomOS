
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Alert,
  CircularProgress,
  useTheme,
  IconButton,
  InputAdornment,
  Divider,
} from '@mui/material';
import { 
    Sun, 
    Moon, 
    Plus,
    Users,
    Hash,
    HouseLine,
    ArrowRight
} from '@phosphor-icons/react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth';
import useThemeStore from '../store/themeStore';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const GroupSetup = () => {
    const [groupName, setGroupName] = useState('');
    const [joinId, setJoinId] = useState('');
    const { token, setUser, setGroup } = useAuthStore();
    const { mode, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const theme = useTheme();

    // Create Group Mutation
    const createMutation = useMutation({
        mutationFn: async (name) => {
            const response = await api.post('/group/create', { name }, token);
            return response;
        },
        onSuccess: (data) => {
            // Update local storage/state with new group info
            let user = {};
            try {
                user = JSON.parse(localStorage.getItem('user') || '{}');
            } catch (e) {
                user = {};
            }
            user.group_id = data.group_id;
            user.role = 'admin';
            setUser(user);
            setGroup({ id: data.group_id, name: groupName });
            toast.success(`Group "${groupName}" initialized!`);
            navigate('/dashboard');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create group');
        }
    });

    // Join Group Mutation
    const joinMutation = useMutation({
        mutationFn: async (group_id) => {
            await api.post('/group/join', { group_id }, token);
            return { group_id };
        },
        onSuccess: (data) => {
            toast.success('Join request submitted. Expect admin sync soon.');
            navigate('/dashboard');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to join group');
        }
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        createMutation.mutate(groupName);
    };

    const handleJoin = (e) => {
        e.preventDefault();
        if (!joinId.trim()) return;
        joinMutation.mutate(joinId);
    };

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: 'background.default',
            background: mode === 'light' 
                ? 'linear-gradient(135deg, #EBF4FF 0%, #F5F3FF 100%)' 
                : 'linear-gradient(135deg, #0A0C10 0%, #111827 100%)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.4s'
        }}>
            {/* Header / Top Bar */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                px: { xs: 3, sm: 4 }, 
                py: 4,
                zIndex: 10 
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                        sx={{ 
                            width: 52, 
                            height: 52, 
                            bgcolor: 'white',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 1,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                    >
                        <Box 
                            component="img" 
                            src="/logo.png" 
                            alt="OurSpaceOS" 
                            sx={{ height: '100%', width: 'auto' }} 
                        />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        OurSpaceOS
                    </Typography>
                </Box>
                <IconButton onClick={toggleTheme}>
                    {mode === 'light' ? <Moon size={24} weight="fill" /> : <Sun size={24} weight="fill" />}
                </IconButton>
            </Box>

            <Container maxWidth="sm" sx={{ flex: 1, py: 4, zIndex: 1 }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-1px' }}>
                        Setup Group
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 6, fontSize: '1.1rem' }}>
                        You need to join or create a flat group to continue.
                    </Typography>


                    {/* Create Section */}
                    <Box component="form" onSubmit={handleCreate}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, display: 'block' }}>
                            New Connection
                        </Typography>
                        <TextField
                            fullWidth
                            label="Create New Group"
                            placeholder="e.g. Flat 302"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Plus size={20} weight="bold" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '18px',
                                    bgcolor: mode === 'light' ? 'white' : 'rgba(255,255,255,0.05)',
                                    boxShadow: mode === 'light' ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                                    '& fieldset': { border: 'none' },
                                }
                            }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={createMutation.isPending || !groupName.trim()}
                            startIcon={createMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <HouseLine size={24} weight="bold" />}
                            sx={{ mt: 2, py: 2, borderRadius: '18px', fontWeight: 700, textTransform: 'none' }}
                        >
                            Create Group
                        </Button>
                    </Box>

                    <Box sx={{ my: 6, display: 'flex', alignItems: 'center' }}>
                        <Divider sx={{ flex: 1, opacity: 0.5 }} />
                        <Typography variant="body2" sx={{ px: 3, color: 'text.secondary', fontWeight: 600 }}>OR</Typography>
                        <Divider sx={{ flex: 1, opacity: 0.5 }} />
                    </Box>

                    {/* Join Section */}
                    <Box component="form" onSubmit={handleJoin}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, display: 'block' }}>
                            Existing Group
                        </Typography>
                        <TextField
                            fullWidth
                            label="Join via ID"
                            placeholder="Enter 5-digit code"
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Hash size={20} weight="bold" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '18px',
                                    bgcolor: mode === 'light' ? 'white' : 'rgba(255,255,255,0.05)',
                                    boxShadow: mode === 'light' ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                                    '& fieldset': { border: 'none' },
                                }
                            }}
                        />
                        <Button
                            type="submit"
                            variant="outlined"
                            fullWidth
                            disabled={joinMutation.isPending || !joinId.trim()}
                            startIcon={joinMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <Users size={24} weight="bold" />}
                            sx={{ mt: 2, py: 2, borderRadius: '18px', fontWeight: 700, textTransform: 'none', border: '2px solid' }}
                        >
                            Join Existing
                        </Button>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
};

export default GroupSetup;
