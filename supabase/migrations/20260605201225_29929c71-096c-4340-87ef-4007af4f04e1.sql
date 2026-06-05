
CREATE OR REPLACE FUNCTION public.generate_ssra_order_number()
 RETURNS text LANGUAGE plpgsql SET search_path TO 'public','extensions'
AS $function$
DECLARE code text; exists_already boolean;
BEGIN
  LOOP
    code := 'SSRA-ENR-' || to_char(now(), 'YYYY') || '-' ||
            upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.ssra_enrollments WHERE order_number = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END; $function$;

CREATE OR REPLACE FUNCTION public.generate_ssra_cert_code()
 RETURNS text LANGUAGE plpgsql SET search_path TO 'public','extensions'
AS $function$
DECLARE code TEXT; exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'SSRA-' || to_char(now(), 'YYYY') || '-' ||
            upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.ssra_certificates WHERE certificate_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END; $function$;
