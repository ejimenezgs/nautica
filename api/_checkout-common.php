<?php
declare(strict_types=1);
const NAUTICA_STRIPE_API = 'https://api.stripe.com/v1';
const NAUTICA_DEFAULT_CATALOG_API = 'https://segel-erp.vercel.app/api/catalogo';

function json_response(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
function require_post(): void { if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_response(['error'=>'Método no permitido.'],405); }
function read_json(): array { $d=json_decode(file_get_contents('php://input') ?: '', true); if(!is_array($d)) json_response(['error'=>'Solicitud JSON inválida.'],400); return $d; }
function load_config(): array {
    $candidates=[];
    $env=getenv('NAUTICA_PRIVATE_CONFIG'); if($env) $candidates[]=$env;
    $doc=rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''),'/');
    if($doc!==''){ $home=dirname(dirname($doc)); $candidates[]=$home.'/private/nautica-home.php'; $candidates[]=dirname($doc).'/private/nautica-home.php'; }
    $candidates[]=dirname(__DIR__).'/private-config.php';
    foreach($candidates as $p){ if($p && is_file($p)){ $c=require $p; if(is_array($c)) return $c; } }
    throw new RuntimeException('Falta la configuración privada de Stripe en el servidor.');
}
function same_origin(array $config): void {
    $host=strtolower((string)(parse_url((string)($config['site_url'] ?? 'https://nauticahome.com.mx'),PHP_URL_HOST) ?? ''));
    $src=trim((string)($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '')); if($src==='') return;
    $srcHost=strtolower((string)(parse_url($src,PHP_URL_HOST) ?? '')); if($host!=='' && $srcHost!==$host) throw new RuntimeException('Origen no autorizado.');
}
function http_request(string $url,string $method='GET',array $headers=[],?string $body=null): array {
    $ch=curl_init($url); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_TIMEOUT=>25,CURLOPT_CONNECTTIMEOUT=>8,CURLOPT_FOLLOWLOCATION=>false]);
    if($body!==null) curl_setopt($ch,CURLOPT_POSTFIELDS,$body); $resp=curl_exec($ch); $err=curl_error($ch); $status=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE); curl_close($ch);
    if($resp===false) throw new RuntimeException('Error de red: '.$err); return [$status,$resp];
}
function decode_fs_value(array $v): mixed {
    foreach(['stringValue','integerValue','doubleValue','booleanValue'] as $k) if(array_key_exists($k,$v)) return $k==='integerValue'?(int)$v[$k]:($k==='doubleValue'?(float)$v[$k]:$v[$k]);
    if(isset($v['mapValue']['fields'])) return decode_fs_fields($v['mapValue']['fields']);
    if(isset($v['arrayValue']['values'])) return array_map('decode_fs_value',$v['arrayValue']['values']); return null;
}
function decode_fs_fields(array $fields): array { $r=[]; foreach($fields as $k=>$v) $r[$k]=decode_fs_value($v); return $r; }
function list_overrides(string $projectId): array {
    [$status,$body]=http_request('https://firestore.googleapis.com/v1/projects/'.rawurlencode($projectId).'/databases/(default)/documents/catalogProductOverrides?pageSize=1000');
    if($status!==200) return [];
    $p=json_decode($body,true); $out=[]; foreach(($p['documents']??[]) as $doc){ $id=rawurldecode(substr((string)$doc['name'],strrpos((string)$doc['name'],'/')+1)); $out[strtoupper(trim($id))]=decode_fs_fields($doc['fields']??[]); } return $out;
}
function extract_items($payload): array {
    if(is_array($payload) && array_is_list($payload)) return $payload;
    if(!is_array($payload)) return [];
    foreach(['products','productos','items','catalogo','data','results','result'] as $k){ if(isset($payload[$k]) && is_array($payload[$k])) { $v=$payload[$k]; if(array_is_list($v)) return $v; foreach(['products','productos','items','catalogo','results'] as $nk) if(isset($v[$nk]) && is_array($v[$nk]) && array_is_list($v[$nk])) return $v[$nk]; } }
    return [];
}
function first_value(array $row,array $keys): mixed { foreach($keys as $k) if(array_key_exists($k,$row) && $row[$k]!=='' && $row[$k]!==null) return $row[$k]; return null; }
function number_value(mixed $v): ?float { if(is_int($v)||is_float($v)) return (float)$v; if(!is_string($v)) return null; $s=preg_replace('/[^0-9,.-]/','',$v); if($s==='') return null; $lc=strrpos($s,','); $ld=strrpos($s,'.'); if($lc!==false && ($ld===false||$lc>$ld)) $s=str_replace(',','.',str_replace('.','',$s)); else $s=str_replace(',','',$s); return is_numeric($s)?(float)$s:null; }
function catalog_map(array $config): array {
    $api=(string)($config['catalog_api_url'] ?? NAUTICA_DEFAULT_CATALOG_API); [$status,$body]=http_request($api,'GET',['Accept: application/json']); if($status!==200) throw new RuntimeException('No se pudo consultar el catálogo.');
    $payload=json_decode($body,true); $map=[]; foreach(extract_items($payload) as $raw){ if(!is_array($raw)) continue; $code=trim((string)first_value($raw,['codigo','código','code','sku','SKU','clave','idProducto','productId','codigoProducto','productCode','itemCode'])); if($code==='') continue; $price=number_value(first_value($raw,['precio','price','precioBase','basePrice','precioVenta','sellingPrice','salePrice','precio_publico'])); $name=trim((string)first_value($raw,['nombre','name','nombreProducto','productName','producto','descripcionCorta','shortDescription'])); $img=trim((string)first_value($raw,['imageUrl','imagenUrl','imagenURL','image','imagen','foto','photo','urlImagen','image_url'])); $map[strtoupper($code)]=['code'=>$code,'name'=>$name?:$code,'price'=>$price,'image'=>$img]; }
    return $map;
}
function stripe_request(array $config,string $path,array $params): array {
    $key=trim((string)($config['stripe_secret_key']??'')); if(!preg_match('/^(sk|rk)_(test|live)_/',$key)) throw new RuntimeException('Stripe no está configurado.');
    [$status,$body]=http_request(NAUTICA_STRIPE_API.$path,'POST',['Authorization: Bearer '.$key,'Content-Type: application/x-www-form-urlencoded'],http_build_query($params)); $data=json_decode($body,true); if($status<200||$status>=300) throw new RuntimeException((string)($data['error']['message']??'Stripe rechazó la solicitud.')); return $data;
}
