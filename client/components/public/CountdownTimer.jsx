import React, { useEffect, useState } from 'react';

const CountdownTimer = ({phpTimestamp, sec, extFunc}) => {
  const [timeRemaining, setTimeRemaining] = useState({});

  useEffect(() => {
    const targetDate = new Date(phpTimestamp * 1000);

    const calculateTimeRemaining = () => {
      const now = new Date();
      const difference = targetDate - now;

      let timeRemaining = {};

      if (difference > 0) {
        timeRemaining = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      } else {
        timeRemaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        if (extFunc) {
          extFunc()
        }
      }

      setTimeRemaining(timeRemaining);
    };

    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [phpTimestamp, extFunc]);

  return (
    sec ?
    <>{timeRemaining.seconds? timeRemaining.seconds: "0"}s</> :
    <> {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m </>
  );
};

export default CountdownTimer;
