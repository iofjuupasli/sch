// TODO: fix design for +- of lock time
// TODO: better icons
// TODO: favicon
// TODO: push to GH-pages

const {DragDropContext, Draggable, Droppable} = ReactBeautifulDnd;
const {useState, useEffect, useCallback} = React;
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
    if (index === 0 && !newLock) {
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

const onItemReorder = (state) => (indexFrom, indexTo) => {
    if (indexFrom === indexTo) {
        return state;
    }
    if (indexFrom === 0 || indexTo === 0) {
        return state;
    }
    if (indexFrom < indexTo) {
        // from 1 to 3
        //  0 1 2 3 4
        // [a b c d e]
        // [a c d b e]
        return {
            ...state,
            data: state.data.map((item, i) =>
                i < indexFrom ? item :
                i > indexTo ? item :
                i === indexTo ? state.data[indexFrom] :
                state.data[i + 1],
            ),
        };
    }
    if (indexTo < indexFrom) {
        // from 3 to 1
        //  0 1 2 3 4
        // [a b c d e]
        // [a d b c e]
        return {
            ...state,
            data: state.data.map((item, i) =>
                i < indexTo ? item :
                i > indexFrom ? item :
                i === indexTo ? state.data[indexFrom] :
                state.data[i - 1],
            ),
        };
    }
    throw new Error(`unexpected args`);
};

const formatTime = (time) =>
    `${Math.floor(time / 60)}:${(time % 60) || `00`}`;

const formatDuration = (duration) =>
    `${Math.floor(duration / 60)}h ${(duration % 60) || `00`}m`

const AppView = ({innerRef, droppableProps, dragPlaceholder, now, data, onTitleChange, onAddAfter, onRemove, onDurationChange, onLockChange}) => (
    h(`div`, {ref: innerRef, ...droppableProps},
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
                h(Draggable, {
                    key: index,
                    draggableId: `` + index,
                    index,
                }, 
                    (provided) => (
                        h(`div`, {
                            ref: provided.innerRef,
                            ...provided.draggableProps,
                            ...provided.dragHandleProps,
                            className: `
                                item
                                ${time <= getTimeFromDate(now) && getTimeFromDate(now) < (time + duration) ? `current` : ``}
                                ${(time + duration) <= getTimeFromDate(now) ? `past` : ``}
                                ${warning ? `warning` : ``}
                                ${lock ? `lock` : ``}`,
                        },
                            h(`div`, {className: `controls`},
                                h(`div`, {},
                                    lock ?
                                        h(`button`, {
                                            onClick: () => {
                                                onLockChange(index, time - 10)
                                            }
                                        },
                                            `-`
                                        ) :
                                        null,
                                    h(`span`, {
                                        className: `startTime`,
                                        onClick: () => {
                                            onLockChange(index, lock ? null : time)
                                        }
                                    },
                                        formatTime(time)
                                    ),
                                    lock ? h(`button`, {onClick: () => {onLockChange(index, time + 10)}}, `+`) : null,
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
                    ),
                )
            )),
            dragPlaceholder,
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

const encode = (state) => {
    return state.data.map(({title, duration, lock}) =>
        `${Math.floor(duration / 100)}${(duration / 10) % 10}` +
        (lock ? `${Math.floor(lock / 1000)}${Math.floor(lock / 100) % 10}${(lock / 10) % 10}` : `flt`) +
        title
    ).join(`~`);
};

const decode = (str) => {
    if (!str) {
        return null;
    }
    return {
        data: str.split(`~`).map((itemStr) => ({
            duration: parseInt(itemStr.substring(0, 2)) * 10,
            lock: itemStr.substring(2, 5) === `flt` ? null : (parseInt(itemStr.substring(2, 5)) * 10),
            title: decodeURIComponent(itemStr.substring(5)),
        })),
    };
};

const useHashState = (initialValue) => {
    const [state, setState] = useState(decode(location.hash.substring(1)) || initialValue);
    const setHashState = (newState) => {
        setState(newState);
        setTimeout(() => {
            location.replace(`#${encode(newState)}`);
        }, 0);
    };
    return [state, setHashState];
};

const App = () => {
    const [state, setState] = useHashState({
        data: getInitialData(new Date()),
    });
    
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(new Date());
        }, 10000);
        return () => {
            clearInterval(intervalId);
        };
    }, []);
    const onDragEnd = useCallback(({source, destination, reason}) => {
        if (!destination) {
            return;
        }
        if (source.index === destination.index) {
            return;
        }
        const newState = onItemReorder(state)(source.index, destination.index);
        setState(newState);
    }, [state, setState, onItemReorder]);
    
    return h(DragDropContext, {onDragEnd},
        h(Droppable, {droppableId: `list`}, 
            (provided) => (
                h(AppView, {
                    innerRef: provided.innerRef,
                    droppableProps: provided.droppableProps,
                    dragPlaceholder: provided.placeholder,
                    now,
                    data: state.data,
                    onTitleChange: (...args) => setState(onTitleChange(state)(...args)),
                    onAddAfter: (...args) => setState(onAddAfter(state)(...args)),
                    onRemove: (...args) => setState(onRemove(state)(...args)),
                    onDurationChange: (...args) => setState(onDurationChange(state)(...args)),
                    onLockChange: (...args) => setState(onLockChange(state)(...args)),
                })
            ),
        ),
    );
    return ;
};

const domContainer = document.getElementById('app');
ReactDOM.render(h(App), domContainer);
