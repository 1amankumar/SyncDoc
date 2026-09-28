import {
    createContext,
    useContext,
    useState,
    type ReactNode
} from "react";

// ========================================
// Context Type
// ========================================

interface BlockContextType {
    activeBlockId: string | null;

    cursorPosition: number;

    selectionStart: number;

    selectionEnd: number;

    setActiveBlockId: (
        blockId: string | null
    ) => void;

    setCursorPosition: (
        position: number
    ) => void;

    setSelectionStart: (
        position: number
    ) => void;

    setSelectionEnd: (
        position: number
    ) => void;
}

// ========================================
// Context
// ========================================

const BlockContext =
    createContext<BlockContextType | undefined>(
        undefined
    );

// ========================================
// Provider
// ========================================

interface BlockProviderProps {
    children: ReactNode;
}

export const BlockProvider = ({
    children
}: BlockProviderProps) => {

    const [
        activeBlockId,
        setActiveBlockId
    ] = useState<string | null>(null);

    const [
        cursorPosition,
        setCursorPosition
    ] = useState<number>(0);

    const [
        selectionStart,
        setSelectionStart
    ] = useState<number>(0);

    const [
        selectionEnd,
        setSelectionEnd
    ] = useState<number>(0);

    return (
        <BlockContext.Provider
            value={{
                activeBlockId,
                cursorPosition,
                selectionStart,
                selectionEnd,
                setActiveBlockId,
                setCursorPosition,
                setSelectionStart,
                setSelectionEnd
            }}
        >
            {children}
        </BlockContext.Provider>
    );
};

// ========================================
// Custom Hook
// ========================================

export const useBlockContext = (): BlockContextType => {

    const context = useContext(
        BlockContext
    );

    if (!context) {
        throw new Error(
            "useBlockContext must be used inside BlockProvider"
        );
    }

    return context;
};