
import React, { useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { House } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
    const theme = useTheme();

    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3000); // 3s duration
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <Box 
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: `radial-gradient(circle at center, ${theme.palette.primary.light} 0%, transparent 70%)`,
                    opacity: 0.3,
                    zIndex: -1,
                }
            }}
        >
            {/* Center Content */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
                {/* Logo Container */}
                <Box 
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '24px',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 12px 24px rgba(11, 87, 208, 0.2)',
                        mb: 3,
                        position: 'relative',
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.5, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        <House size={40} weight="fill" color="#ffffff" />
                    </motion.div>
                </Box>
                
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                >
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 500,
                            letterSpacing: '-0.5px',
                            color: 'text.primary',
                            mb: 0.5
                        }}
                    >
                        OurSpaceOS
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                >
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            fontWeight: 400,
                            color: 'text.secondary',
                            letterSpacing: '0.1px'
                        }}
                    >
                        Shared Living, Perfectly Balanced.
                    </Typography>
                </motion.div>
            </motion.div>

            {/* Bottom Branding */}
            <Box 
                sx={{
                    position: 'absolute',
                    bottom: 64,
                    textAlign: 'center'
                }}
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 1 }}
                >
                    <Typography 
                        variant="caption" 
                        sx={{ 
                            opacity: 0.5, 
                            letterSpacing: '1px', 
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            display: 'block',
                            mb: 0.5,
                            color: 'text.secondary'
                        }}
                    >
                        Handcrafted by
                    </Typography>
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontWeight: 500,
                            color: 'text.primary',
                            fontSize: '0.9rem'
                        }}
                    >
                        Sumit &amp; Aditya
                    </Typography>
                </motion.div>
            </Box>

            {/* M3 Loading Indicator */}
            <Box 
                sx={{
                    position: 'absolute',
                    bottom: 120,
                    width: 40,
                    height: 4,
                    bgcolor: 'primary.light',
                    borderRadius: 2,
                    overflow: 'hidden'
                }}
            >
                <motion.div
                    animate={{ 
                        left: ['-100%', '100%'],
                    }}
                    transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        width: '50%',
                        height: '100%',
                        background: theme.palette.primary.main,
                        borderRadius: 2,
                    }}
                />
            </Box>
        </Box>
    );
};

export default SplashScreen;
