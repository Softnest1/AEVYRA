/// <reference types="nativewind/types" />

// Déclaration des modules d'assets statiques pour TypeScript
declare module '*.png' {
  const value: number;
  export default value;
}

// Déclaration CSS modules — évite TS2882 sur import de *.css
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Déclaration des balises HTML natives utilisées dans les blocs isWeb (EXPO_OS === 'web')
// Nécessaire car le compilateur RN ne connaît pas JSX.IntrinsicElements HTML
declare namespace JSX {
  interface IntrinsicElements {
    div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
    span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
    canvas: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
    svg: React.SVGProps<SVGSVGElement>;
    g: React.SVGProps<SVGGElement>;
    circle: React.SVGProps<SVGCircleElement>;
    rect: React.SVGProps<SVGRectElement>;
    path: React.SVGProps<SVGPathElement>;
    defs: React.SVGProps<SVGDefsElement>;
    title: React.DetailedHTMLProps<React.HTMLAttributes<HTMLTitleElement>, HTMLTitleElement>;
    head: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadElement>, HTMLHeadElement>;
    link: React.DetailedHTMLProps<React.LinkHTMLAttributes<HTMLLinkElement>, HTMLLinkElement>;
    meta: React.DetailedHTMLProps<React.MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>;
    script: React.DetailedHTMLProps<React.ScriptHTMLAttributes<HTMLScriptElement>, HTMLScriptElement>;
    style: React.DetailedHTMLProps<React.StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>;
    [key: string]: any;
  }
}
