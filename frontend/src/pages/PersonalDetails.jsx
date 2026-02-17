
import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, 
    Container, 
    Typography, 
    Card, 
    Stack, 
    IconButton, 
    TextField, 
    Button, 
    Avatar, 
    useTheme, 
    alpha,
    CircularProgress
} from '@mui/material';
import { 
    CaretLeft, 
    Camera, 
    User, 
    EnvelopeSimple,
    FloppyDisk,
    Trash
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { API_BASE } from '../api';
import useAuthStore from '../store/auth';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PersonalDetails = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: authUser, setUser: setAuthUser } = useAuthStore();
    const fileInputRef = useRef(null);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [previewImage, setPreviewImage] = useState(null);

    // Query for fresh user data
    const { data: userData, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: () => api.get('/auth/me')
    });

    // Query for profile picture
    const { data: picData } = useQuery({
        queryKey: ['profile-pic'],
        queryFn: () => api.get('/auth/get-profile-picture')
    });

    useEffect(() => {
        if (userData?.user) {
            setName(userData.user.name || '');
            setEmail(userData.user.email || '');
        }
    }, [userData]);

    // Mutation: Update basic profile
    const updateMutation = useMutation({
        mutationFn: (payload) => api.post('/auth/update-profile', payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['me']);
            setAuthUser({ ...authUser, name: name, email: email });
            toast.success('Profile details updated');
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Update failed')
    });

    // Mutation: Upload profile picture
    const uploadPicMutation = useMutation({
        mutationFn: (base64) => api.post('/auth/upload-profile-picture', { profile_picture: base64 }),
        onSuccess: () => {
            queryClient.invalidateQueries(['profile-pic']);
            setPreviewImage(null);
            toast.success('Profile picture updated');
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Upload failed')
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 500 * 1024) {
                toast.error('Image too large. Max 500KB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                // Auto-upload when selected
                uploadPicMutation.mutate(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePic = () => {
        uploadPicMutation.mutate(null);
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const profilePicUrl = picData?.profile_picture 
        ? `${API_BASE}/../uploads/${picData.profile_picture}` 
        : null;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
            {/* Header */}
            <Box sx={{ px: 3, pt: 4, pb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton 
                    onClick={() => navigate(-1)} 
                    sx={{ bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                >
                    <CaretLeft size={20} weight="bold" />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-1.5px' }}>Personal Details</Typography>
            </Box>

            <Container maxWidth="sm">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    
                    {/* Avatar Selection Card */}
                    <Card sx={{ 
                        p: 4, borderRadius: '28px', mb: 3, textAlign: 'center',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.04)', 
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: 'background.paper'
                    }}>
                        <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto', mb: 3 }}>
                            <Avatar 
                                src={previewImage || profilePicUrl}
                                sx={{ 
                                    width: 120, height: 120, 
                                    fontSize: '3rem', fontWeight: 900, 
                                    bgcolor: 'primary.main',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                                }}
                            >
                                {name.charAt(0)}
                            </Avatar>
                            <IconButton 
                                onClick={() => fileInputRef.current?.click()}
                                sx={{ 
                                    position: 'absolute', bottom: -5, right: -5,
                                    bgcolor: 'primary.main', color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                }}
                            >
                                <Camera size={20} weight="fill" />
                            </IconButton>
                            <input 
                                type="file" 
                                hidden 
                                ref={fileInputRef} 
                                accept="image/*" 
                                onChange={handleFileChange} 
                            />
                        </Box>
                        
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{name}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, fontWeight: 600 }}>{email}</Typography>
                        
                        {profilePicUrl && (
                            <Button 
                                size="small" 
                                color="error" 
                                startIcon={<Trash size={16} weight="bold" />}
                                onClick={handleRemovePic}
                                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '12px' }}
                            >
                                Remove Picture
                            </Button>
                        )}
                    </Card>

                    {/* Edit Form Card */}
                    <Card sx={{ 
                        p: 3, borderRadius: '28px', 
                        boxShadow: '0 8px 30px rgba(0,0,0,0.04)', 
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: 'background.paper'
                    }}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', tracking: '1px', mb: 3, display: 'block' }}>
                            UPDATE INFORMATION
                        </Typography>
                        
                        <Stack spacing={3}>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, ml: 1, mb: 1, display: 'block', color: 'text.secondary' }}>FULL NAME</Typography>
                                <TextField 
                                    fullWidth
                                    variant="outlined"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                    InputProps={{
                                        startAdornment: (
                                            <Box sx={{ color: 'primary.main', mr: 1, display: 'flex' }}>
                                                <User size={20} weight="bold" />
                                            </Box>
                                        ),
                                        sx: { borderRadius: '18px', fontWeight: 700, bgcolor: 'rgba(0,0,0,0.01)' }
                                    }}
                                />
                            </Box>

                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, ml: 1, mb: 1, display: 'block', color: 'text.secondary' }}>EMAIL ADDRESS</Typography>
                                <TextField 
                                    fullWidth
                                    variant="outlined"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    InputProps={{
                                        startAdornment: (
                                            <Box sx={{ color: 'primary.main', mr: 1, display: 'flex' }}>
                                                <EnvelopeSimple size={20} weight="bold" />
                                            </Box>
                                        ),
                                        sx: { borderRadius: '18px', fontWeight: 700, bgcolor: 'rgba(0,0,0,0.01)' }
                                    }}
                                />
                            </Box>

                            <Button 
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={() => updateMutation.mutate({ name, email })}
                                disabled={updateMutation.isPending || (name === userData?.user?.name && email === userData?.user?.email)}
                                startIcon={updateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <FloppyDisk size={24} weight="bold" />}
                                sx={{ 
                                    py: 2, 
                                    borderRadius: '20px', 
                                    fontWeight: 800, 
                                    fontSize: '1rem',
                                    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.2)',
                                    textTransform: 'none'
                                }}
                            >
                                {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </Stack>
                    </Card>

                    <Box sx={{ mt: 4, px: 2, textAlign: 'center', opacity: 0.6 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            Your information is shared with other members of your Space for coordination.
                        </Typography>
                    </Box>

                </motion.div>
            </Container>
        </Box>
    );
};

export default PersonalDetails;
