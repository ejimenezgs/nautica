<?php
declare(strict_types=1);
require __DIR__ . '/_checkout-common.php';
require_post();
try {
    $config=load_config(); same_origin($config); $input=read_json();
    $customer=is_array($input['customer']??null)?$input['customer']:[]; $postal=preg_replace('/\D+/','',(string)($customer['postalCode']??'')); $n=(int)$postal;
    $supported=strlen($postal)===5 && (($n>=1000&&$n<=16999)||($n>=50000&&$n<=57999)); if(!$supported) throw new RuntimeException('Stripe está disponible únicamente para CDMX y Estado de México.');
    $email=trim((string)($customer['email']??'')); if(!filter_var($email,FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Correo inválido.');
    $items=is_array($input['items']??null)?$input['items']:[]; if(!$items) throw new RuntimeException('La bolsa está vacía.');
    $catalog=catalog_map($config); $overrides=list_overrides((string)($config['firebase_project_id']??'nautica-ca65d'));
    $line=[]; foreach($items as $i=>$item){ if(!is_array($item)) continue; $code=trim((string)($item['code']??'')); $key=strtoupper($code); if($code===''||!isset($catalog[$key])) throw new RuntimeException('Producto inválido: '.$code); $api=$catalog[$key]; $ov=$overrides[$key]??[]; if(($ov['hidden']??false)===true) throw new RuntimeException('Un producto ya no está disponible.'); $base=$api['price']; if($base===null||$base<0) throw new RuntimeException('Un producto requiere cotización.'); $promo=isset($ov['promoPrice'])&&is_numeric($ov['promoPrice'])?(float)$ov['promoPrice']:null; $price=($promo!==null&&$promo>=0&&$promo<$base)?$promo:$base; $qty=max(1,min(99,(int)($item['quantity']??1))); $name=trim((string)($ov['customName']??''))?:$api['name']; $img=trim((string)($ov['imageUrl']??''))?:$api['image']; $line[$i]=['quantity'=>$qty,'price_data'=>['currency'=>'mxn','unit_amount'=>(int)round($price*100),'product_data'=>['name'=>$name,'metadata'=>['code'=>$api['code']]]]]; if($img!=='') $line[$i]['price_data']['product_data']['images']=[$img]; }
    $site=rtrim((string)($config['site_url']??'https://nauticahome.com.mx'),'/');
    $params=['mode'=>'payment','payment_method_types'=>['card'],'customer_email'=>$email,'success_url'=>$site.'/checkout.html?stripe=success&session_id={CHECKOUT_SESSION_ID}','cancel_url'=>$site.'/checkout.html?stripe=cancel','locale'=>'es','line_items'=>$line];
    $session=stripe_request($config,'/checkout/sessions',$params); if(empty($session['url'])) throw new RuntimeException('Stripe no devolvió una sesión válida.'); json_response(['ok'=>true,'url'=>$session['url'],'sessionId'=>$session['id']??'']);
} catch(Throwable $e){ error_log('nautica checkout: '.$e->getMessage()); json_response(['ok'=>false,'error'=>$e->getMessage()?:'No se pudo iniciar el pago.'],400); }
