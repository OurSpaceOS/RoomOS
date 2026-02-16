
import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => createTheme({
    palette: {
        mode: mode,
        primary: {
            main: mode === 'light' ? '#0b57d0' : '#a8c7fa', // Modern Google Blue / Lighter for dark
            dark: mode === 'light' ? '#0842a0' : '#418efd',
            light: mode === 'light' ? '#d3e3fd' : '#041e49',
            container: mode === 'light' ? '#d3e3fd' : '#0842a0',
            onContainer: mode === 'light' ? '#041e49' : '#d3e3fd',
        },
        secondary: {
            main: mode === 'light' ? '#1b6ef3' : '#7fcfff',
            container: mode === 'light' ? '#c2e7ff' : '#004a77',
            onContainer: mode === 'light' ? '#001d35' : '#c2e7ff',
        },
        background: {
            default: mode === 'light' ? '#EBF4FF' : '#0A0C10', // Soft pastel blue / Deep OLED black-blue
            paper: mode === 'light' ? '#FFFFFF' : '#111827', // Clean white / Slate 900
        },
        text: {
            primary: mode === 'light' ? '#1f1f1f' : '#e2e2e2',
            secondary: mode === 'light' ? '#444746' : '#c4c7c5',
        },
        divider: mode === 'light' ? '#c4c7c5' : '#444746',
    },
    typography: {
        fontFamily: '"Outfit", "Plus Jakarta Sans", "Inter", sans-serif',
        h4: {
            fontWeight: 400,
            fontSize: '2rem',
            letterSpacing: 0,
        },
        h5: {
            fontWeight: 400,
            fontSize: '1.5rem',
        },
        body1: {
            fontSize: '1rem',
            letterSpacing: '0.1px',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            letterSpacing: '0.2px',
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    padding: '10px 24px',
                    borderRadius: 40,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                        backgroundColor: mode === 'light' ? 'rgba(11, 87, 208, 0.08)' : 'rgba(168, 199, 250, 0.08)',
                    },
                },
                contained: {
                    backgroundColor: mode === 'light' ? '#0b57d0' : '#a8c7fa',
                    color: mode === 'light' ? '#ffffff' : '#041e49',
                    '&:hover': {
                        backgroundColor: mode === 'light' ? '#0842a0' : '#d3e3fd',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    },
                },
                outlined: {
                    borderColor: mode === 'light' ? '#747775' : '#8e918f',
                    color: mode === 'light' ? '#0b57d0' : '#a8c7fa',
                    '&:hover': {
                        backgroundColor: mode === 'light' ? 'rgba(11, 87, 208, 0.04)' : 'rgba(168, 199, 250, 0.04)',
                        borderColor: mode === 'light' ? '#747775' : '#8e918f',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 4,
                        '& fieldset': {
                            borderColor: mode === 'light' ? '#747775' : '#8e918f',
                        },
                        '&:hover fieldset': {
                            borderColor: mode === 'light' ? '#1f1f1f' : '#e2e2e2',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: mode === 'light' ? '#0b57d0' : '#a8c7fa',
                            borderWidth: '2px',
                        },
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 28,
                    boxShadow: 'none',
                    border: mode === 'light' ? '1px solid #c4c7c5' : '1px solid #444746',
                    backgroundImage: 'none', // Disable MUI dark mode paper overlay
                },
                elevation1: {
                    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)',
                },
            },
        },
    },
});

export default getTheme;
