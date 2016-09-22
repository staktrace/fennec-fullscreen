XPI=../fullscreen.xpi

xpi:
	rm -f $(XPI) && zip -r $(XPI) * -x *.swp Makefile assets/ assets/*

publish:
	scp $(XPI) limpet.net:limpet.net/mbrubeck/temp
