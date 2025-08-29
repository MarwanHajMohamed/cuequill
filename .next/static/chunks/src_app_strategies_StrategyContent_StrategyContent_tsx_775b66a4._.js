(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/src/app/strategies/StrategyContent/StrategyContent.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>StrategyContent
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function StrategyContent(param) {
    let { blocks } = param;
    _s();
    const [loadedImages, setLoadedImages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const handleImageLoad = (idx)=>{
        setLoadedImages((prev)=>({
                ...prev,
                [idx]: true
            }));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-5 mb-[30px]",
        children: blocks.map((block, idx)=>{
            switch(block.type){
                case "text":
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: block.content
                    }, idx, false, {
                        fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                        lineNumber: 22,
                        columnNumber: 20
                    }, this);
                case "image":
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "",
                        children: [
                            !loadedImages[idx] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: ""
                            }, void 0, false, {
                                fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                                lineNumber: 27,
                                columnNumber: 40
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: block.src,
                                alt: block.alt || "",
                                onLoad: ()=>handleImageLoad(idx),
                                style: {
                                    display: loadedImages[idx] ? "block" : "none"
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                                lineNumber: 28,
                                columnNumber: 17
                            }, this)
                        ]
                    }, idx, true, {
                        fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                        lineNumber: 26,
                        columnNumber: 15
                    }, this);
                case "chart":
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                children: "Chart"
                            }, void 0, false, {
                                fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                                lineNumber: 40,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: block.src,
                                alt: block.alt || "",
                                className: ""
                            }, void 0, false, {
                                fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                                lineNumber: 41,
                                columnNumber: 17
                            }, this)
                        ]
                    }, idx, true, {
                        fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                        lineNumber: 39,
                        columnNumber: 15
                    }, this);
                case "video":
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                        controls: true,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                            src: block.src
                        }, void 0, false, {
                            fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                            lineNumber: 48,
                            columnNumber: 17
                        }, this)
                    }, idx, false, {
                        fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                        lineNumber: 47,
                        columnNumber: 15
                    }, this);
                case "list":
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        children: block.items.map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "list-disc ml-8",
                                children: item
                            }, i, false, {
                                fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                                lineNumber: 56,
                                columnNumber: 19
                            }, this))
                    }, idx, false, {
                        fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
                        lineNumber: 54,
                        columnNumber: 15
                    }, this);
                default:
                    return null;
            }
        })
    }, void 0, false, {
        fileName: "[project]/src/app/strategies/StrategyContent/StrategyContent.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_s(StrategyContent, "0gLG4ywkNAjbCTXnuwvCa0rRyLE=");
_c = StrategyContent;
var _c;
__turbopack_context__.k.register(_c, "StrategyContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=src_app_strategies_StrategyContent_StrategyContent_tsx_775b66a4._.js.map