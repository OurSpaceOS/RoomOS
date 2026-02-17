
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
  Link,
  useTheme,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { 
    Sun, 
    Moon, 
    ArrowRight,
    CaretLeft,
    Eye,
    EyeSlash,
    EnvelopeSimple,
    LockSimple
} from '@phosphor-icons/react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth';
import useThemeStore from '../store/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [credentials, setCredentials] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const { setToken, setGroup, setUser } = useAuthStore();
    const { mode, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const theme = useTheme();

    // Basic Validation
    const isFormValid = isLogin 
        ? (credentials.email.trim() !== '' && credentials.password.trim() !== '')
        : (credentials.name.trim() !== '' && credentials.email.trim() !== '' && credentials.password.trim() !== '');

    // Auth Mutation
    const authMutation = useMutation({
        mutationFn: async (creds) => {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const response = await api.post(endpoint, creds);
            return response;
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.message || 'Authentication failed';
            toast.error(msg);
        },
        onSuccess: (data) => {
            if (isLogin) {
                setToken(data.token);
                setGroup(data.group);
                setUser({ 
                    id: data.user.id, 
                    name: data.user.name, 
                    role: data.user.role, 
                    group_id: data.user.group_id 
                });
                toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
                navigate('/dashboard'); 
            } else {
                // After registration, toggle back to login
                setIsLogin(true);
                toast.success('Registration successful. Please log in.');
                // Optionally clear credentials or just show success
                setCredentials({ name: '', email: credentials.email, password: '' });
            }
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isFormValid) return;
        authMutation.mutate(credentials);
    };

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const toggleAuthMode = () => {
        setIsLogin(!isLogin);
        authMutation.reset();
    };

    return (
        <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: 'background.default',
            background: mode === 'light' 
                ? 'linear-gradient(135deg, #EBF4FF 0%, #F3E8FF 100%)' 
                : 'linear-gradient(135deg, #0A0C10 0%, #111827 100%)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            {/* Ambient Background Glows */}
            <Box sx={{ 
                position: 'absolute', 
                top: '-15%', 
                right: '-10%', 
                width: '60%', 
                height: '50%', 
                background: mode === 'light' 
                    ? 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)' 
                    : 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
                zIndex: 0,
                borderRadius: '50%',
                filter: 'blur(60px)'
            }} />

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
                            overflow: 'hidden'
                        }}
                    >
                        <Box 
                            component="img" 
                            src="/logo.png" 
                            alt="OurSpaceOS" 
                            sx={{ height: '100%', width: '100%', objectFit: 'contain' }} 
                        />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: 'text.primary', fontSize: '1.6rem' }}>
                        OurSpaceOS
                    </Typography>
                </Box>
                <IconButton 
                    onClick={toggleTheme} 
                    sx={{ 
                        color: mode === 'dark' ? '#FFD60A' : '#1D1D1F',
                        bgcolor: mode === 'light' ? 'white' : 'rgba(255,255,255,0.08)',
                        width: 48,
                        height: 48,
                        boxShadow: mode === 'light' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': { transform: 'scale(1.1)', bgcolor: mode === 'light' ? 'white' : 'rgba(255,255,255,0.12)' }
                    }}
                >
                    {mode === 'light' ? <Moon size={24} weight="fill" /> : <Sun size={24} weight="fill" />}
                </IconButton>
            </Box>

            <Container 
                maxWidth="sm"
                sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    px: { xs: 4, sm: 6 },
                    pb: 6,
                    zIndex: 1
                }}
            >
                {/* Branding Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ mb: 4, mt: 2 }}>
                        <Typography variant="h3" sx={{ 
                            fontWeight: 700, 
                            color: 'text.primary', 
                            fontSize: { xs: '2.8rem', sm: '3.5rem' },
                            letterSpacing: '-1.5px',
                            mb: 1
                        }}>
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.2rem', fontWeight: 500, opacity: 0.8 }}>
                            {isLogin ? 'Shared living, perfectly balanced.' : 'Join the OurSpaceOS community today.'}
                        </Typography>
                    </Box>
                </motion.div>

                {/* Form Section */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    style={{ flex: 1 }}
                >
                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <AnimatePresence mode="wait">
                            {authMutation.isError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <Alert 
                                        severity="error" 
                                        variant="filled" 
                                        sx={{ 
                                            mb: 3, 
                                            borderRadius: 3, 
                                            bgcolor: mode === 'light' ? '#fee2e2' : '#7f1d1d',
                                            color: mode === 'light' ? '#991b1b' : '#fecaca',
                                            border: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {authMutation.error?.response?.data?.message || authMutation.error.message || 'Authentication failed. Please check your details.'}
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="name"
                                    label="Full Name"
                                    name="name"
                                    autoComplete="name"
                                    value={credentials.name}
                                    onChange={handleChange}
                                    variant="outlined"
                                    sx={{ 
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '16px',
                                            bgcolor: mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
                                            backdropFilter: 'blur(10px)',
                                            border: mode === 'light' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                            '& fieldset': { border: 'none' },
                                            '&.Mui-focused fieldset': { border: `2px solid ${theme.palette.primary.main}` },
                                        }
                                    }}
                                />
                            </motion.div>
                        )}

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            value={credentials.email}
                            onChange={handleChange}
                            variant="outlined"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EnvelopeSimple size={20} color={theme.palette.text.secondary} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '16px',
                                    bgcolor: mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(10px)',
                                    border: mode === 'light' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                    '& fieldset': { border: 'none' },
                                    '&.Mui-focused fieldset': { border: `2px solid ${theme.palette.primary.main}` },
                                }
                            }}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            value={credentials.password}
                            onChange={handleChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockSimple size={20} color={theme.palette.text.secondary} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ 
                                mt: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '16px',
                                    bgcolor: mode === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(10px)',
                                    border: mode === 'light' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                                    '& fieldset': { border: 'none' },
                                    '&.Mui-focused fieldset': { border: `2px solid ${theme.palette.primary.main}` },
                                }
                            }}
                        />

                        {isLogin && (
                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <Link 
                                    href="#" 
                                    variant="body2" 
                                    sx={{ fontWeight: 700, textDecoration: 'none', color: 'primary.main' }}
                                >
                                    Forgot Password?
                                </Link>
                            </Box>
                        )}

                        <Box sx={{ mt: 6 }}>
                             <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={authMutation.isPending || !isFormValid}
                                endIcon={!authMutation.isPending && <ArrowRight size={22} weight="bold" />}
                                sx={{ 
                                    py: 2.2,
                                    borderRadius: '18px',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    boxShadow: mode === 'light' ? '0 8px 16px -4px rgba(11, 87, 208, 0.3)' : '0 8px 16px -4px rgba(0,0,0,0.5)',
                                    textTransform: 'none',
                                    '&.Mui-disabled': {
                                        bgcolor: mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                                        color: mode === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)'
                                    },
                                    '&:hover': {
                                        transform: isFormValid ? 'translateY(-2px)' : 'none',
                                        boxShadow: isFormValid ? (mode === 'light' ? '0 12px 20px -4px rgba(11, 87, 208, 0.4)' : '0 12px 20px -4px rgba(0,0,0,0.6)') : 'none',
                                    },
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {authMutation.isPending ? <CircularProgress size={28} color="inherit" /> : (isLogin ? 'Log In' : 'Register')}
                            </Button>
                        </Box>

                        <Box sx={{ mt: 2 }}>
                             <Button
                                fullWidth
                                onClick={toggleAuthMode}
                                sx={{ 
                                    py: 1.5,
                                    borderRadius: '16px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    color: 'text.secondary',
                                    bgcolor: mode === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                                    '&:hover': {
                                        bgcolor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                                    },
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {isLogin ? "New here? Create account" : "Already have an account? Log In"}
                            </Button>
                        </Box>
                    </Box>
                </motion.div>

                <Box sx={{ mt: 'auto', textAlign: 'center', opacity: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.5px' }}>
                        © OurSpaceOS
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default Login;
