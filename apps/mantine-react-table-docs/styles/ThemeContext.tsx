import { createContext, useState } from 'react';
import {
  type MantineColor,
  MantineProvider,
  createTheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  CodeHighlightAdapterProvider,
  createHighlightJsAdapter,
} from '@mantine/code-highlight';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import { type MantineShade } from '@careharmony/mantine-react-table-ng';
import { useContext } from 'react';

// highlight.js has no JSX grammar. Its JavaScript and TypeScript grammars parse JSX.
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
const highlightJsAdapter = createHighlightJsAdapter(hljs);

const ThemeContext = createContext<{
  darkDark: boolean;
  setDarkDark: (darkDark: boolean) => void;
  primaryColor: MantineColor;
  setPrimaryColor: (primaryColor: MantineColor) => void;
  primaryShade: MantineShade;
  setPrimaryShade: (primaryShade: MantineShade) => void;
}>({} as any);

export const ThemeContextProvider = ({ children }) => {
  //read after hydration, so the server and the first client render match
  const [darkDark, setDarkDark] = useLocalStorage<boolean>({
    defaultValue: false,
    getInitialValueInEffect: true,
    key: 'darkDark',
  });
  const [primaryColor, setPrimaryColor] = useState<MantineColor>('teal');
  const [primaryShade, setPrimaryShade] = useState<MantineShade>(7);

  return (
    <MantineProvider
      theme={createTheme({
        colors: darkDark
          ? {
              dark: [
                '#C1C2C5',
                '#A6A7AB',
                '#909296',
                '#5c5f66',
                '#373A40',
                '#2C2E33',
                '#25262b',
                '#1A1B1E',
                '#141517',
                '#101113',
              ],
            }
          : {},
        cursorType: 'pointer',
        primaryColor,
        primaryShade,
        headings: {
          sizes: {
            h1: { fontWeight: '100', fontSize: '32px', lineHeight: '1.4' },
            h2: { fontSize: '30px', lineHeight: '1.5' },
            h3: { fontSize: '26px', lineHeight: '1.5' },
            h4: { fontSize: '22px', lineHeight: '1.5' },
            h5: { fontSize: '20px', lineHeight: '1.5' },
            h6: { fontWeight: '900' },
          },
        },
        components: {
          Card: {
            defaultProps: {
              shadow: 'sm',
              withBorder: true,
            },
          },
          Code: {
            defaultProps: {
              fz: '0.9em',
            },
          },
          Tooltip: {
            defaultProps: {
              withArrow: true,
              portalProps: {
                target: '.mantine-tooltips',
              },
            },
          },
          Tabs: {
            styles: () => ({
              tab: {
                fontSize: '1.1rem',
                marginTop: '2rem',
                alignItems: 'center',
                display: 'flex',
              },
            }),
          },
        },
      })}
    >
      <ThemeContext.Provider
        value={{
          darkDark,
          setDarkDark,
          primaryColor,
          setPrimaryColor,
          primaryShade,
          setPrimaryShade,
        }}
      >
        <CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
          {children}
        </CodeHighlightAdapterProvider>
      </ThemeContext.Provider>
    </MantineProvider>
  );
};

export const useThemeContext = () => {
  return useContext(ThemeContext);
};
