// TODO: onAddBefore
// TODO: dnd
// TODO: better icons
// TODO: favicon
// TODO: save state in URL
// TODO: push to GH-pages

const {useState} = React;
const h = React.createElement;

const onTitleChange = (state) => (index, newTitle) => {
    return {
        ...state,
        data: state.data.map((item, i) => i === index ? {
            ...item,
            title: newTitle,
        } : item),
    }
};

const onAddAfter = (state) => (index) => {
    return {
        ...state,
        data: state.data.reduce((newData, item, i) => {
            newData.push(item);
            if (i === index) {
                newData.push({duration: 30, title: ``});
            }
            return newData;
        }, []),
    };
};

const onRemove = (state) => (index) => {
    if (state.data.length === 1) {
        return {
            ...state,
            data: getInitialData(new Date()),
        };
    }
    if (index === 0) {
        const nextLock = state.data[0].lock + state.data[0].duration;
        return {
            ...state,
            data: state.data
                .filter((item, i) => i !== index)
                .map((item, i) => i === 0 ? {
                    ...item,
                    lock: nextLock,
                } : item)
        };
    }
    return {
        ...state,
        data: state.data.filter((item, i) => i !== index),
    };
};

const onDurationChange = (state) => (index, newDuration) => {
    return {
        ...state,
        data: state.data.map((item, i) => i === index ? {
            ...item,
            duration: newDuration,
        } : item),
    };
};

const onLockChange = (state) => (index, newLock) => {
    if (index === 0) {
        return state;
    }
    return {
        ...state,
        data: state.data.map((item, i) => i === index ? {
            ...item,
            lock: newLock,
        } : item),
    };
};

const formatTime = (time) =>
    `${Math.floor(time / 60)}:${(time % 60) || `00`}`;

const formatDuration = (duration) =>
    `${Math.floor(duration / 60)}h ${(duration % 60) || `00`}m`

const AppView = ({now, data, onTitleChange, onAddAfter, onRemove, onDurationChange, onLockChange}) => (
    h(`div`, {},
        data
            .reduce((dataWithTime, item) => {
                if (item.lock) {
                    dataWithTime.push({...item, time: item.lock});
                    return dataWithTime;
                }
                const previousItem = dataWithTime[dataWithTime.length - 1];
                dataWithTime.push({...item, time: previousItem.time + previousItem.duration});
                return dataWithTime;
            }, [])
            .reduceRight((newData, item) => {
                const nextLock = newData.find(({lock}) => lock);
                if (nextLock && nextLock.lock < (item.time + item.duration)) {
                    newData.unshift({...item, warning: true});
                    return newData;
                }
                newData.unshift(item);
                return newData;
            }, [])
            .map(({title, duration, warning, lock, time}, index) => (
                h(`div`, {
                    key: index,
                    className: `
                        item
                        ${time <= getTimeFromDate(now) && getTimeFromDate(now) < (time + duration) ? `current` : ``}
                        ${(time + duration) <= getTimeFromDate(now) ? `past` : ``}
                        ${warning ? `warning` : ``}
                        ${lock ? `lock` : ``}`,
                },
                    h(`div`, {className: `controls`},
                        h(`div`, {
                            onClick: () => {
                                onLockChange(index, lock ? null : time)
                            }
                        },
                            h(`span`, {className: `startTime`},
                                formatTime(time)
                            ),
                            `-`,
                            formatTime(time + duration)
                        ),
                        h(`div`, {className: `duration`},
                            h(`button`, {
                                onClick: () => {
                                    onDurationChange(index, Math.max(0, duration - 10));
                                }
                            },
                                `-`
                            ),
                            formatDuration(duration),
                            h(`button`, {
                                onClick: () => {
                                    onDurationChange(index, duration + 10);
                                }
                            },
                                `+`
                            )
                        ),
                        h(`div`, {className: `remove`},
                            h(`button`, {
                                onClick: () => {
                                    onRemove(index);
                                }
                            },
                                `x`
                            )
                        ),
                    ),
                    h(`div`, {},
                        h(`input`, {
                            placeholder: `Title...`,
                            value: title,
                            onChange: (event) => {
                                const newTitle = event.target.value;
                                onTitleChange(index, event.target.value);
                            },
                            onKeyPress: (event) => {
                                if (event.key === `Enter`) {
                                    onAddAfter(index);
                                    setTimeout(() => {
                                        document.getElementsByTagName(`input`)[index + 1].focus();
                                    }, 100)
                                }
                            }
                        }),
                    ),
                )
            ))
    )
);

const getTimeFromDate = (date) =>
    date.getHours() * 60 + date.getMinutes();

const getInitialData = (now) => [
    {
        title: ``,
        duration: 30,// minutes
        lock: ceil(getTimeFromDate(now)),// optional, minutes from 00:00
    }
];

const round = (x) =>
    Math.round(x / 10) * 10;

const ceil = (x) =>
    Math.ceil(x / 10) * 10;

const lsCache = {};
const getLSCached = (key) =>
    lsCache[key] ||
    (lsCache[key] = JSON.parse(localStorage.getItem(key)));

const useLSState = (key, initialValue) => {
    const [state, setState] = useState(getLSCached(key) || initialValue);
    const setLSState = (newState) => {
        setState(newState);
        setTimeout(() => {
            localStorage.setItem(key, JSON.stringify(newState));
        }, 0);
    };
    return [state, setLSState];
};

const App = () => {
    const [state, setState] = useLSState(`schstate`, {
        data: getInitialData(new Date()),
    });
    
    const [now, setNow] = useState(new Date());
    setInterval(() => {
        setNow(new Date());
    }, 10000);

    return h(AppView, {
        now,
        data: state.data,
        onTitleChange: (...args) => setState(onTitleChange(state)(...args)),
        onAddAfter: (...args) => setState(onAddAfter(state)(...args)),
        onRemove: (...args) => setState(onRemove(state)(...args)),
        onDurationChange: (...args) => setState(onDurationChange(state)(...args)),
        onLockChange: (...args) => setState(onLockChange(state)(...args)),
    });
};

const domContainer = document.getElementById('app');
ReactDOM.render(h(App), domContainer);
