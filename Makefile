NAME=deno

uninstall:
	jupyter kernelspec uninstall -f $(NAME)

list:
	jupyter kernelspec list

run:
	deno run --allow-all --unstable ideno.ts kernel -c ./src/testdata/connfile.json

install:
	deno run --allow-all --unstable ideno.ts install

clean:
	rm Untitled*.ipynb