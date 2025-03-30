import React from 'react';
import {Box, LinearProgress, Typography, Paper} from '@mui/material';

interface GoalTrackerProps {
    goal: number;
    currentBalance: number;
}

const GoalTracker: React.FC<GoalTrackerProps> = ({goal, currentBalance}) => {
    const progress = Math.min((currentBalance / goal) * 100, 100);

    return (
        <Paper sx={{p: 2, mb: 3}}>
            <Typography variant="h6" gutterBottom>
                Goal Tracker
            </Typography>
            <Typography variant="body1" gutterBottom>
                Savings Goal: {goal.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
            </Typography>
            <Box sx={{display: 'flex', alignItems: 'center'}}>
                <Box sx={{width: '100%', mr: 1}}>
                    <LinearProgress variant="determinate" value={progress}/>
                </Box>
                <Box sx={{minWidth: 35}}>
                    <Typography variant="body2" color="text.secondary">
                        {`${Math.round(progress)}%`}
                    </Typography>
                </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                Current Balance: {currentBalance.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
            </Typography>
        </Paper>
    );
};

export default GoalTracker;