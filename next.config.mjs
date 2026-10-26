const basePath=(process.env.NEXT_PUBLIC_BASE_PATH||'').replace(/\/$/,'');
if(basePath&&!/^\/[A-Za-z0-9_.\-/]+$/.test(basePath))throw new Error('Invalid NEXT_PUBLIC_BASE_PATH');
export default {output:'export',trailingSlash:true,basePath,assetPrefix:basePath||undefined,images:{unoptimized:true},poweredByHeader:false};
